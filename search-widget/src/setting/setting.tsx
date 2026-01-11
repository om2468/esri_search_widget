/** @jsx jsx */
import { React, jsx, Immutable } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { TextInput, NumericInput, Label } from 'jimu-ui';
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { IMConfig } from '../config';

export default function Setting(props: AllWidgetSettingProps<IMConfig>) {
    const { config, onSettingChange } = props;

    const updateConfig = (key: keyof IMConfig, value: string | number) => {
        onSettingChange({
            id: props.id,
            config: config.set(key, value)
        });
    };

    return (
        <div className="widget-setting-search">
            <SettingSection title="API Configuration">
                <SettingRow label="API Base URL">
                    <TextInput
                        size="sm"
                        value={config.baseUrl || ''}
                        onChange={(e) => updateConfig('baseUrl', e.target.value)}
                    />
                </SettingRow>
                <SettingRow label="API Token">
                    <TextInput
                        size="sm"
                        type="password"
                        value={config.token || ''}
                        onChange={(e) => updateConfig('token', e.target.value)}
                    />
                </SettingRow>
            </SettingSection>

            <SettingSection title="Display Settings">
                <SettingRow label="Results per Page">
                    <NumericInput
                        size="sm"
                        min={10}
                        max={100}
                        value={config.pageSize || 40}
                        onChange={(value) => updateConfig('pageSize', value)}
                    />
                </SettingRow>
                <SettingRow label="Description Length">
                    <NumericInput
                        size="sm"
                        min={50}
                        max={500}
                        value={config.descriptionLength || 100}
                        onChange={(value) => updateConfig('descriptionLength', value)}
                    />
                </SettingRow>
            </SettingSection>
        </div>
    );
}
