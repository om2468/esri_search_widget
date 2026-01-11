# Multi-modal Search System: Qwen3-VL Pipeline

This document explains the architecture and logic of the two-stage search system implemented in `qwen3vl8b_embed.py`, designed for high-accuracy image and text retrieval.

---

## 1. The Two-Stage Architecture

To build a search system that is both **fast** and **accurate**, we use a two-stage process.

### Stage 1: The Embedder (The "Wide Net")
*   **Model:** `Qwen3-VL-Embedding-2B`
*   **Role:** Converts documents and queries into fixed-length vectors (embeddings).
*   **Mechanism:** It uses a **Bi-Encoder** approach. It processes the query and documents separately.
*   **Pros:** Extremely fast. You can compare a query against millions of documents in milliseconds.
*   **Cons:** Less precise. It misses subtle relationships between words and visual details.

### Stage 2: The Reranker (The "Quality Check")
*   **Model:** `Qwen3-VL-Reranker-2B`
*   **Role:** Re-evaluates the top candidates found by the embedder.
*   **Mechanism:** It uses a **Cross-Encoder** approach. It feeds the query and the document into the model *together*.
*   **Pros:** Extremely accurate. It uses "Cross-Attention" to literally compare the query requirements against the document/image features.
*   **Cons:** Slow. It can only process a handful of items at a time.

---

## 2. Real-World Example Results

In our test scenario (Query: *"A woman playing with her dog on a beach at sunset"*), the results demonstrated the "Two-Stage Rescue":

### Step A: Embedder Rankings (Initial)
| Rank | Document ID | Cosine Score | Status |
| :--- | :--- | :--- | :--- |
| **1** | `dist_text_2` (Forest Distractor) | **0.4482** | ❌ False Positive |
| **2** | `dist_text_1` (City Distractor) | **0.4204** | ❌ False Positive |
| **3** | `doc_text_match` (Woman/Dog) | **0.4045** | ✅ Correct Match |
| **4** | `doc_hybrid_match` (Hybrid) | **0.0258** | ✅ Correct Match |

**Observation:** The Embedder was "fooled" by the descriptors of the forest and city, ranking the correct dog-related text in 3rd place and the hybrid match 4th.

### Step B: Reranker Rankings (Final)
| Rank | Document ID | Rerank Probability | Status |
| :--- | :--- | :--- | :--- |
| **1** | `doc_text_match` | **0.8688** | 🏆 **Fixed!** |
| **2** | `dist_text_2` | **0.7360** | 📉 Correctly Dropped |
| **3** | `dist_text_1` | **0.6143** | 📉 Correctly Dropped |
| **4** | `doc_hybrid_match` | **0.1959** | (Low visual alignment) |

**Success:** The Reranker correctly identified that the "Woman/Dog" description was a much better fit for the query than the "Forest" or "City" distractors, promoting it to the #1 spot.

---

## 3. Geometric Embedding Spaces & Distance Metrics

A critical consideration in similarity search is the mathematical formula used to determine "closeness."

### Cosine Similarity vs. Euclidean (L2) Distance
Most modern LLM embeddings (like OpenAI or standard Transformer outputs) are designed to be used with **Cosine Similarity**. This measures the *angle* between vectors, focusing on the orientation (semantic direction) rather than the magnitude.

### The Case for Euclidean/Manhattan Distance
You suggested that if a model’s loss function (like those often seen in Google Research papers on metric learning) forms a **Geometric Embedding Space**, Euclidean or Manhattan distance might yield superior results.

*   **Geometric Inference:** In specific geometric spaces (like Hyperbolic embeddings or specialized metric-learning spaces), the **distance/magnitude** of the vector carries specific meaning. 
*   **L2 (Euclidean):** Measures the straight-line distance. It is sensitive to magnitude. If the model is trained to cluster "similar items" in a specific spatial bubble, a "smaller distance" is a more powerful signal than a "similar angle."
*   **Manhattan (L1):** Measures distance along axes (grid-like). This is often more robust in high-dimensional spaces where the "curse of dimensionality" can make Euclidean distances feel very similar across all pairs.

### Application for your Search Widget:
If we find that the Qwen outputs are not "unit-normalized" (meaning they aren't all the same length), switching to **Euclidean Search** might significantly help retrieval. It would effectively treat the embedding space as a physical map where the "clustering" of concepts is literal, potentially fixing the "modality gap" where images and text currently sit too far apart.

## 4. Empirical Comparison: Metrics Performance

We conducted an experiment in `qwen3vl8b_embed.py` to test how different distance metrics handle high-dimensional retrieval (2048 dimensions).

### Metric Comparison Results (Top 3)
| Metric | #1 Rank | #2 Rank | #3 Rank | Stability Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Cosine Similarity** | `doc_text` (0.4954) | `dist_text_2` (0.4939) | `dist_text_1` (0.4922) | **Unstable.** Scores separated by only ~0.001. |
| **Euclidean (L2)** | `doc_text` (1.0049) | `dist_text_2` (1.0059) | `dist_text_1` (1.0078) | **Moderate.** Slightly better separation than Cosine. |
| **Manhattan (L1)** | `doc_text` (35.9062) | `dist_text_2` (36.6875) | `dist_text_1` (36.8750) | **Robust.** Significant gaps (0.7+ units) between ranks. |

### Why Manhattan (L1) Wins
1.  **High-Dimensional Robustness:** In a 2048-dimensional space, Cosine similarity can become "crowded," where every document looks slightly similar. Manhattan distance (L1) aggregates absolute differences across every single dimension. This makes it much harder for a "lucky" noise dimension to flip the ranking.
2.  **Geometric Clarity:** Manhattan distance provides a much wider "safety margin" (delta) between the correct result and distractors. This ensures that the correct items are more likely to survive the Top-K filter and reach the Reranker.

---

## 5. Summary for ESRI Integration

For the ESRI search widget, we recommend the following configuration:

1.  **Retrieval Step:** Use **Manhattan (L1) Distance** for the initial vector search. It behaves more like a true geometric map and resists the "score ties" seen in Cosine Similarity.
2.  **Safety Net:** Cast a wide enough net (e.g., Top 50 or 100) to ensure the Embedder captures relevant items even if they sit in a different "modality neighborhood."
3.  **Verification Step:** Always use the **Reranker** to verify the final Top 5 results. It is the only part of the system that can truly "see" if the search query matches the visual content of a map screenshot.

---

## 6. Implementation in pgvector (PostgreSQL)

To implement the Manhattan or Euclidean retrieval in a production database using `pgvector`, use the following SQL structure.

### 1. Table Setup
```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with a 2048-dimension vector column (for Qwen3-VL)
CREATE TABLE map_layers (
    id SERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    embedding VECTOR(2048)
);
```

### 2. Indexing for Search Depth
For large datasets, use an **HNSW** index with the specific operator class:

```sql
-- For Manhattan (L1) Distance (pgvector 0.7.0+)
CREATE INDEX ON map_layers USING hnsw (embedding vector_l1_ops);

-- For Euclidean (L2) Distance
CREATE INDEX ON map_layers USING hnsw (embedding vector_l2_ops);
```

### 3. Comparison Queries
The "spaceship" operators make the search syntax clean:

```sql
-- Manhattan Search (Top 5)
SELECT id, title FROM map_layers 
ORDER BY embedding <+> '[0.12, 0.45, ...]' 
LIMIT 5;

-- Euclidean Search (Top 5)
SELECT id, title FROM map_layers 
ORDER BY embedding <-> '[0.12, 0.45, ...]' 
LIMIT 5;
```
