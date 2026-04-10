/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface QRBaseURLConfig {
    mode: 'auto' | 'lan' | 'custom';
    lanIp: string;
    lanPort: string;
    customUrl: string;
}

interface QRBaseURLContextType {
    config: QRBaseURLConfig;
    setConfig: (config: QRBaseURLConfig) => void;
    getBaseUrl: () => string;
    fetchNetworkDefaults: () => Promise<void>;
}

const STORAGE_KEY = 'qr_base_url_config';

const DEFAULT_CONFIG: QRBaseURLConfig = {
    mode: 'auto',
    lanIp: '',
    lanPort: window.location.port || '5173',
    customUrl: '',
};

const QRBaseURLContext = createContext<QRBaseURLContextType | undefined>(undefined);

export const useQRBaseURL = () => {
    const context = useContext(QRBaseURLContext);
    if (!context) {
        throw new Error('useQRBaseURL must be used within a QRBaseURLProvider');
    }
    return context;
};

export const QRBaseURLProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfigState] = useState<QRBaseURLConfig>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
            } catch (e) {
                console.error('Failed to parse QR base URL config:', e);
            }
        }
        return DEFAULT_CONFIG;
    });

    const setConfig = useCallback((newConfig: QRBaseURLConfig) => {
        setConfigState(newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }, []);

    const fetchNetworkDefaults = useCallback(async () => {
        try {
            const res = await fetch('/api/network-info');
            if (res.ok) {
                const info = await res.json();
                setConfigState(prev => {
                    const next = {
                        ...prev,
                        lanIp: info.ip || prev.lanIp,
                    };
                    // Only update port if it's the default or was 5173 and info.port is different
                    if (!prev.lanPort || prev.lanPort === '5173') {
                        next.lanPort = String(info.port);
                    }
                    return next;
                });
            }
        } catch (e) {
            console.error('Failed to fetch network info:', e);
        }
    }, []);

    useEffect(() => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && !config.lanIp) {
            fetchNetworkDefaults();
        }
    }, [fetchNetworkDefaults, config.lanIp]);

    const getBaseUrl = useCallback(() => {
        if (config.mode === 'lan' && config.lanIp) {
            const port = config.lanPort ? `:${config.lanPort}` : '';
            return `http://${config.lanIp}${port}`;
        }
        if (config.mode === 'custom' && config.customUrl) {
            // Ensure protocol is present
            let url = config.customUrl;
            if (!/^https?:\/\//i.test(url)) {
                url = `http://${url}`;
            }
            // Remove trailing slash if present
            return url.replace(/\/$/, '');
        }
        // Default / Auto mode
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocal && config.lanIp) {
            // If we are on localhost but have a LAN IP, favor the LAN IP for the QR code
            // We use the current port because if the user is on 5173, they likely want to use the dev server
            // (which we've now enabled --host for)
            return `http://${config.lanIp}:${window.location.port}`;
        }
        return `${window.location.protocol}//${window.location.host}`;
    }, [config]);

    return (
        <QRBaseURLContext.Provider value={{ config, setConfig, getBaseUrl, fetchNetworkDefaults }}>
            {children}
        </QRBaseURLContext.Provider>
    );
};
