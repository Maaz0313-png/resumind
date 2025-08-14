// Clear Resume Data Utility
// This script helps clear all resume data from the application

console.log('🧹 Resume Data Cleaner');
console.log('This utility will help you clear stored resume data');

// Browser-based clearing (run this in browser console)
const clearBrowserData = () => {
    console.log('Clearing browser storage...');
    
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    const resumeKeys = localStorageKeys.filter(key => key.includes('resume'));
    resumeKeys.forEach(key => {
        console.log(`Removing localStorage key: ${key}`);
        localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    const sessionResumeKeys = sessionStorageKeys.filter(key => key.includes('resume'));
    sessionResumeKeys.forEach(key => {
        console.log(`Removing sessionStorage key: ${key}`);
        sessionStorage.removeItem(key);
    });
    
    // Clear IndexedDB (if used by Puter)
    if ('indexedDB' in window) {
        console.log('Checking IndexedDB databases...');
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                if (db.name.includes('puter') || db.name.includes('resume')) {
                    console.log(`Found database: ${db.name}`);
                    const deleteReq = indexedDB.deleteDatabase(db.name);
                    deleteReq.onsuccess = () => console.log(`Deleted database: ${db.name}`);
                    deleteReq.onerror = () => console.error(`Failed to delete database: ${db.name}`);
                }
            });
        });
    }
    
    console.log('✅ Browser storage cleared');
};

// Export for use in browser
if (typeof window !== 'undefined') {
    window.clearBrowserData = clearBrowserData;
    console.log('Run clearBrowserData() in the browser console to clear stored data');
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { clearBrowserData };
}
