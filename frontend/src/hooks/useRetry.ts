import { useState } from 'react';
import { toast } from 'sonner';
import { isBackendWarmingUp } from '@/services/api';
import { useResultsStore } from '@/stores/resultsStore';

export function useRetry(mode: 'forecast' | 'cv' = 'forecast') {
    const store = useResultsStore();
    const [lastErrorWasTimeout, setLastErrorWasTimeout] = useState(false);

    const executeWithRetry = async (apiCall: () => Promise<void>) => {
        store.setLoading(true);
        if (mode === 'forecast') {
            store.setWarmingUp(true);
            store.setError(null);
        } else {
            store.setCvWarmingUp(true);
            store.setCvError(null);
        }
        setLastErrorWasTimeout(false);
        
        try {
            await apiCall();
            if (mode === 'forecast') store.setWarmingUp(false);
            else store.setCvWarmingUp(false);
        } catch (err: any) {
            if (mode === 'forecast') store.setWarmingUp(false);
            else store.setCvWarmingUp(false);
            
            if (isBackendWarmingUp(err)) {
                setLastErrorWasTimeout(true);
                const msg = 'Backend is warming up (first request can take a minute). Please wait and try again.';
                if (mode === 'forecast') store.setError(msg);
                else store.setCvError(msg);
                toast.error(msg);
            } else {
                const message = err instanceof Error ? err.message : 'Operation failed';
                if (mode === 'forecast') store.setError(message);
                else store.setCvError(message);
                toast.error(message);
            }
            throw err;
        } finally {
            store.setLoading(false);
        }
    };

    return { executeWithRetry, lastErrorWasTimeout };
}
