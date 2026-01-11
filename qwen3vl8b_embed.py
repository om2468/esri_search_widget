import argparse
import numpy as np
import os
import torch
import torch.nn.functional as F
import logging
import warnings
from typing import List, Dict, Any
from PIL import Image
from transformers import AutoProcessor, AutoModel, AutoModelForSequenceClassification
from qwen_vl_utils import process_vision_info

# Suppress warnings and logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
warnings.filterwarnings("ignore")
logging.getLogger("transformers").setLevel(logging.ERROR)
logging.getLogger("torch").setLevel(logging.ERROR)

# Define a list of query texts
queries = [
    {"text": "A woman playing with her dog on a beach at sunset."}
]

# Define a broader set of documents (including distractors)
documents = [
    # The relevant ones
    {"id": "doc_text_match", "text": "A woman shares a joyful moment with her golden retriever on a sun-drenched beach at sunset, as the dog offers its paw in a heartwarming display of companionship and trust."},
    {"id": "doc_visual_match", "image": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg"},
    {"id": "doc_hybrid_match", "text": "Woman and dog on beach.", "image": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg"},
    
    # Distractors (Text)
    {"id": "dist_text_1", "text": "A busy city intersection with lots of traffic and yellow taxis."},
    {"id": "dist_text_2", "text": "A deep forest with tall pine trees and a small cabin in the distance."},
    
    # Distractors (Visual) - Using the newly generated images
    {"id": "dist_image_city", "image": "/Users/cherrytian/.gemini/antigravity/brain/293acfef-a459-4cb2-9b98-38d0f5b68ee0/busy_city_intersection_1768148233527.png"},
    {"id": "dist_image_office", "image": "/Users/cherrytian/.gemini/antigravity/brain/293acfef-a459-4cb2-9b98-38d0f5b68ee0/modern_office_space_1768148247023.png"}
]

def get_embeddings(model, processor, inputs_list, device, is_query=False):
    embeddings_list = []
    
    # Task-specific instructions for better alignment
    if is_query:
        instruction = "Represent the user's query for retrieving relevant images and descriptions: "
    else:
        instruction = "Represent the document for retrieval: "

    for i, inp in enumerate(inputs_list):
        messages = [{"role": "user", "content": []}]
        
        # Prepend instruction to text
        text_content = inp.get("text", "")
        if text_content:
            messages[0]["content"].append({"type": "text", "text": instruction + text_content})
        elif "image" in inp:
            # If image-only, we just use the instruction as the text prompt
            messages[0]["content"].append({"type": "text", "text": instruction})
            
        if "image" in inp:
            messages[0]["content"].append({"type": "image", "image": inp["image"]})
            
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            last_hidden_state = outputs.last_hidden_state
            attention_mask = inputs.attention_mask
            last_token_idx = attention_mask.sum(dim=1) - 1
            embedding = last_hidden_state[torch.arange(last_hidden_state.size(0)), last_token_idx]
            embedding = F.normalize(embedding, p=2, dim=-1)
            embeddings_list.append(embedding.cpu().numpy()[0])

    return np.array(embeddings_list)

def main():
    parser = argparse.ArgumentParser(description="Two-Stage Multi-modal Search (MPS Optimized)")
    parser.add_argument("--embed-model", type=str, default="Qwen/Qwen3-VL-Embedding-2B", help="Embedding model path")
    parser.add_argument("--rerank-model", type=str, default="Qwen/Qwen3-VL-Reranker-2B", help="Reranker model path")
    parser.add_argument("--top-k", type=int, default=3, help="Number of items to pass to reranker")
    args = parser.parse_args()

    device = torch.device("mps") if torch.backends.mps.is_available() else torch.device("cpu")
    dtype = torch.float16 if device.type == "mps" else torch.float32

    # 1. Loading Models
    print(f"--- 1. LOADING MODELS (Device: {device}) ---")
    embed_processor = AutoProcessor.from_pretrained(args.embed_model, trust_remote_code=True)
    embed_model = AutoModel.from_pretrained(args.embed_model, trust_remote_code=True, dtype=dtype).to(device)
    embed_model.eval()

    rerank_processor = AutoProcessor.from_pretrained(args.rerank_model, trust_remote_code=True)
    rerank_model = AutoModel.from_pretrained(args.rerank_model, trust_remote_code=True, dtype=dtype).to(device)
    rerank_model.eval()

    # 2. Embedding Step
    print("\n--- 2. EMBEDDING RETRIEVAL COMPARISON ---")
    query_embs = get_embeddings(embed_model, embed_processor, queries, device, is_query=True)
    doc_embs = get_embeddings(embed_model, embed_processor, documents, device, is_query=False)
    
    q_v = query_embs[0]
    
    # Calculate different metrics
    # 1. Cosine Similarity (Higher is better)
    cosine_scores = (query_embs @ doc_embs.T)[0]
    
    # 2. Euclidean Distance (L2) (Lower is better)
    euclidean_distances = np.linalg.norm(doc_embs - q_v, axis=1)
    
    # 3. Manhattan Distance (L1) (Lower is better)
    manhattan_distances = np.sum(np.abs(doc_embs - q_v), axis=1)

    metrics = [
        ("Cosine Similarity", cosine_scores, True),
        ("Euclidean Distance (L2)", euclidean_distances, False),
        ("Manhattan Distance (L1)", manhattan_distances, False)
    ]

    for name, scores, reverse in metrics:
        print(f"\nTop {args.top_k} results using {name}:")
        if reverse: # Higher is better
            ranked_indices = np.argsort(scores)[::-1]
        else: # Lower is better
            ranked_indices = np.argsort(scores)
            
        top_indices_for_metric = ranked_indices[:args.top_k]
        for idx in top_indices_for_metric:
            doc = documents[idx]
            print(f"  [{doc['id']}] Score/Dist: {scores[idx]:.4f}")

    # Use Cosine for the reranking stage (standard baseline)
    ranked_indices = np.argsort(cosine_scores)[::-1]
    top_indices = ranked_indices[:args.top_k]

    # 3. Reranking Step
    print(f"\n--- 3. RERANKING (The 'Quality Check' on Top {args.top_k}) ---")
    final_results = []
    query = queries[0]
    
    for idx in top_indices:
        doc = documents[idx]
        messages = [{"role": "user", "content": [{"type": "text", "text": f"Query: {query['text']}\nDocument: "}]}]
        if "image" in doc: messages[0]["content"].append({"type": "image", "image": doc["image"]})
        if "text" in doc: messages[0]["content"].append({"type": "text", "text": doc["text"]})
        
        text = rerank_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = rerank_processor(text=[text], images=image_inputs, videos=video_inputs, padding=True, return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = rerank_model(**inputs)
            if hasattr(outputs, 'logits'):
                logits = outputs.logits
            elif hasattr(rerank_model, 'score'):
                logits = rerank_model.score(outputs.last_hidden_state)
            else:
                logits = outputs.last_hidden_state[:, -1, :1]
            
            score = logits.view(-1).float().cpu().item()
            prob = 1 / (1 + np.exp(-score))
            final_results.append((doc['id'], prob))
    
    # Sort and show final results
    final_results.sort(key=lambda x: x[1], reverse=True)
    print("\nFinal Ranked Results after Reranking:")
    for doc_id, score in final_results:
        print(f"  [{doc_id}] Probability: {score:.4f}")

if __name__ == "__main__":
    main()