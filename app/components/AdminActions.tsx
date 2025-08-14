import { useState } from 'react';
import { usePuterStore } from '~/lib/puter';

const AdminActions = () => {
    const { kv, fs } = usePuterStore();
    const [isClearing, setIsClearing] = useState(false);
    const [clearResult, setClearResult] = useState<string | null>(null);

    const clearAllResumeData = async () => {
        if (!confirm('Are you sure you want to clear ALL resume data? This action cannot be undone.')) {
            return;
        }

        setIsClearing(true);
        setClearResult(null);

        try {
            console.log('Starting resume data cleanup...');
            
            // Since Puter KV doesn't have a list/scan function, we'll need to track IDs differently
            // For now, we'll clear browser storage and any known keys
            
            let clearedCount = 0;
            
            // Clear browser localStorage
            const localStorageKeys = Object.keys(localStorage);
            const resumeKeys = localStorageKeys.filter(key => key.includes('resume'));
            
            for (const key of resumeKeys) {
                localStorage.removeItem(key);
                clearedCount++;
                console.log(`Cleared localStorage key: ${key}`);
            }
            
            // Clear sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            const sessionResumeKeys = sessionStorageKeys.filter(key => key.includes('resume'));
            
            for (const key of sessionResumeKeys) {
                sessionStorage.removeItem(key);
                clearedCount++;
                console.log(`Cleared sessionStorage key: ${key}`);
            }

            // Try to clear some common resume IDs (if you know any specific ones)
            // This is a limitation - ideally you'd want to track all created resume IDs
            const commonIds = ['test', 'demo', 'sample'];
            
            for (const id of commonIds) {
                try {
                    const key = `resume:${id}`;
                    const existing = await kv.get(key);
                    if (existing) {
                        // Note: Puter KV might not have a delete function, so we set to null
                        await kv.set(key, null);
                        clearedCount++;
                        console.log(`Cleared KV key: ${key}`);
                    }
                } catch (error) {
                    console.log(`Key resume:${id} not found or already cleared`);
                }
            }

            setClearResult(`✅ Cleared ${clearedCount} items from storage`);
            console.log(`Resume data cleanup complete. Cleared ${clearedCount} items.`);
            
        } catch (error) {
            console.error('Error clearing resume data:', error);
            setClearResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsClearing(false);
        }
    };

    const clearBrowserStorageOnly = () => {
        if (!confirm('Clear browser storage (localStorage, sessionStorage, IndexedDB)?')) {
            return;
        }

        try {
            // Clear localStorage
            const localStorageKeys = Object.keys(localStorage);
            const resumeKeys = localStorageKeys.filter(key => key.includes('resume') || key.includes('puter'));
            resumeKeys.forEach(key => localStorage.removeItem(key));

            // Clear sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            const sessionResumeKeys = sessionStorageKeys.filter(key => key.includes('resume') || key.includes('puter'));
            sessionResumeKeys.forEach(key => sessionStorage.removeItem(key));

            // Clear IndexedDB
            if ('indexedDB' in window) {
                indexedDB.databases().then(databases => {
                    databases.forEach(db => {
                        if (db.name && (db.name.includes('puter') || db.name.includes('resume'))) {
                            const deleteReq = indexedDB.deleteDatabase(db.name);
                            deleteReq.onsuccess = () => console.log(`Deleted database: ${db.name}`);
                        }
                    });
                });
            }

            setClearResult('✅ Browser storage cleared. Please refresh the page.');
            
        } catch (error) {
            setClearResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="p-6 bg-gray-50 rounded-lg border-2 border-red-200">
            <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Admin Actions</h3>
            
            <div className="space-y-4">
                <div>
                    <button
                        onClick={clearBrowserStorageOnly}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded font-medium"
                        disabled={isClearing}
                    >
                        Clear Browser Storage Only
                    </button>
                    <p className="text-sm text-gray-600 mt-1">
                        Clears localStorage, sessionStorage, and IndexedDB
                    </p>
                </div>

                <div>
                    <button
                        onClick={clearAllResumeData}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium"
                        disabled={isClearing}
                    >
                        {isClearing ? 'Clearing...' : 'Clear All Resume Data'}
                    </button>
                    <p className="text-sm text-gray-600 mt-1">
                        Attempts to clear all resume data from all storage locations
                    </p>
                </div>

                {clearResult && (
                    <div className={`p-3 rounded ${
                        clearResult.includes('❌') 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                    }`}>
                        {clearResult}
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded border">
                <h4 className="font-medium text-blue-800 mb-2">Manual Browser Console Method:</h4>
                <code className="text-sm bg-blue-100 p-2 rounded block">
                    {`// Run this in browser console:
localStorage.clear();
sessionStorage.clear();
// Then refresh the page`}
                </code>
            </div>
        </div>
    );
};

export default AdminActions;
