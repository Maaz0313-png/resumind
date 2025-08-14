import { create } from "zustand";

declare global {
    interface Window {
        puter: any; // Using `any` to avoid deep property checking issues
    }
}

// --- Interfaces for data structures ---

interface PuterUser {
    uid: string;
    name: string;
    email: string;
    // Add other user properties as needed
}

interface FSItem {
    name: string;
    path: string;
    isDirectory: boolean;
}

interface AIResponse {
    message: {
        content: string | [{ text: string }];
    };
}

interface ChatMessage {
    role: string;
    content: any;
}

interface PuterChatOptions {
    model?: string;
}

// --- Main Zustand store ---

interface PuterStore {
    isLoading: boolean;
    error: string | null;
    puterReady: boolean;
    auth: {
        user: PuterUser | null;
        isAuthenticated: boolean;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        refreshUser: () => Promise<void>;
        checkAuthStatus: () => Promise<boolean>;
        getUser: () => PuterUser | null;
    };
    fs: {
        write: (path: string, data: string | File | Blob) => Promise<File | undefined>;
        read: (path: string) => Promise<Blob | undefined>;
        upload: (file: File[] | Blob[]) => Promise<FSItem | undefined>;
        delete: (path: string) => Promise<void>;
        readDir: (path: string) => Promise<FSItem[] | undefined>;
    };
    ai: {
        chat: (prompt: string | ChatMessage[], options?: PuterChatOptions) => Promise<AIResponse | undefined>;
        feedback: (path: string, message: string) => Promise<AIResponse | undefined>;
        img2txt: (image: string | File | Blob) => Promise<string | undefined>;
    };
    kv: {
        get: (key: string) => Promise<string | null | undefined>;
        set: (key: string, value: string) => Promise<boolean | undefined>;
        delete: (key: string) => Promise<boolean | undefined>;
        list: (pattern: string, returnValues?: boolean) => Promise<any[] | undefined>;
        flush: () => Promise<boolean | undefined>;
    };
    init: () => void;
    clearError: () => void;
}

const getPuter = (): any | null => 
    typeof window !== "undefined" && window.puter ? window.puter : null;

export const usePuterStore = create<PuterStore>((set, get) => {
    let reconnectionInterval: NodeJS.Timeout | null = null;

    const setError = (msg: string) => {
        console.error("Puter Error:", msg);
        set({ error: msg, isLoading: false });
    };

    const safeApiCall = async <T>(apiCall: () => Promise<T>): Promise<T | undefined> => {
        const puter = getPuter();
        if (!puter) {
            setError("Puter.js not available");
            return undefined;
        }
        try {
            return await apiCall();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unknown API error occurred";
            console.error("API Error:", err);
            setError(msg);
            return undefined;
        }
    };
    
    const init = () => {
        if (get().puterReady) return;

        const puter = getPuter();
        if (puter) {
            set({ puterReady: true });
            checkAuthStatus();
            return;
        }

        // Fallback polling if Puter.js loads asynchronously
        let checks = 0;
        const interval = setInterval(() => {
            checks++;
            const p = getPuter();
            if (p) {
                clearInterval(interval);
                set({ puterReady: true });
                checkAuthStatus();
            } else if (checks > 50) { // ~10 seconds
                clearInterval(interval);
                setError("Puter.js failed to load");
            }
        }, 200);
    };

    const checkAuthStatus = async (): Promise<boolean> => {
        const result = await safeApiCall(async () => {
            set({ isLoading: true, error: null });
            const isSignedIn = await getPuter().auth.isSignedIn();
            if (isSignedIn) {
                const user = await getPuter().auth.getUser();
                set(state => ({
                    auth: { ...state.auth, user, isAuthenticated: true },
                    isLoading: false,
                }));
                return true;
            } else {
                set(state => ({
                    auth: { ...state.auth, user: null, isAuthenticated: false },
                    isLoading: false,
                }));
                return false;
            }
        });
        return result ?? false;
    };
    
    // Simplified auth methods with proper typing
    const signIn = async (): Promise<void> => {
        const result = await safeApiCall(() => getPuter().auth.signIn().then(() => checkAuthStatus()));
        return;
    };
    
    const signOut = async (): Promise<void> => {
        const result = await safeApiCall(() => getPuter().auth.signOut().then(() => checkAuthStatus()));
        return;
    };
    
    const refreshUser = async (): Promise<void> => {
        const result = await safeApiCall(() => getPuter().auth.getUser().then((user: PuterUser) => set(state => ({ auth: { ...state.auth, user } }))));
        return;
    };

    return {
        isLoading: true,
        error: null,
        puterReady: false,
        init,
        clearError: () => set({ error: null }),
        auth: {
            user: null,
            isAuthenticated: false,
            signIn,
            signOut,
            refreshUser,
            checkAuthStatus,
            getUser: () => get().auth.user,
        },
        fs: {
            write: (path, data) => safeApiCall(() => getPuter().fs.write(path, data)),
            read: (path) => safeApiCall(() => getPuter().fs.read(path)),
            upload: (files) => safeApiCall(() => getPuter().fs.upload(files)),
            delete: (path) => safeApiCall(() => getPuter().fs.delete(path)),
            readDir: (path) => safeApiCall(() => getPuter().fs.readdir(path)),
        },
        ai: {
            chat: (prompt, options) => safeApiCall(() => getPuter().ai.chat(prompt, options)),
            feedback: (path, message) => safeApiCall(() => getPuter().ai.chat([
                { role: "user", content: [{ type: "file", puter_path: path }, { type: "text", text: message }] }
            ], { model: "claude-3-sonnet-20240229" })),
            img2txt: (image) => safeApiCall(() => getPuter().ai.img2txt(image)),
        },
        kv: {
            get: (key) => safeApiCall(() => getPuter().kv.get(key)),
            set: (key, value) => safeApiCall(() => getPuter().kv.set(key, value)),
            delete: (key) => safeApiCall(() => getPuter().kv.delete(key)),
            list: (pattern, returnValues) => safeApiCall(() => getPuter().kv.list(pattern, returnValues)),
            flush: () => safeApiCall(() => getPuter().kv.flush()),
        },
    };
});
