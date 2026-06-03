
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    sendEmailVerification,
    sendPasswordResetEmail, 
    signInWithPopup, 
    GithubAuthProvider, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    updatePassword,
    linkWithPopup,
    linkWithCredential,
    fetchSignInMethodsForEmail,
    getAdditionalUserInfo
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, getDoc, doc, onSnapshot, addDoc, collection, serverTimestamp, setDoc, increment, deleteDoc, orderBy, query, Timestamp, limit, where, updateDoc, writeBatch, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import emailjs from 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm';
// --- Global State ---
let fileCache = [];
let currentCdnLink = "";
let currentRepoInfo = { user: "", repo: "", branch: "", file: "" };

// Elements
const statusMessage = document.getElementById("status-message");
const fileBrowser = document.getElementById("file-browser");
const outputContainer = document.getElementById("output-container");
const zipButton = document.getElementById("zip-download-button");
const aiSection = document.getElementById("ai-section");
const aiOutputContainer = document.getElementById("aiOutputContainer");
const aiLoading = document.getElementById("aiLoading");
const aiContent = document.getElementById("aiContent");
const aiOutputTitle = document.getElementById("aiOutputTitle");


// Line 41 ke aas-paas
const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user'); 
githubProvider.addScope('user:email'); 
window.githubProvider = githubProvider;

// 🔥 YE LINE PAKKA CHECK KAREIN (Isme 'const' hona chahiye)
const googleProvider = new GoogleAuthProvider(); 
googleProvider.setCustomParameters({ prompt: 'select_account' });
window.googleProvider = googleProvider;

// Initialize EmailJS
emailjs.init("kEO4PcIZfSxFb29Af");

// --- AUTH STATE HELPERS ---

// Module-scoped variable to hold a credential during an account-linking flow.
let pendingCredentialForLinking = null;


// --- UI Helpers ---

function escapeHtml(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value = "") {
    return escapeHtml(value);
}

function escapeJsStringForOnclick(value = "") {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/</g, "\\x3C")
        .replace(/>/g, "\\x3E");
}

function safeExternalUrl(value = "#") {
    try {
        const url = new URL(value, window.location.href);
        return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "#";
    } catch {
        return "#";
    }
}

/**
 * Shows a premium toast notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' | 'error'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    // Premium Vercel/Stripe inspired styling
    toast.className = `flex items-start gap-3 px-4 py-3 bg-[#151e32] border border-slate-700/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-sm font-medium text-slate-200 transform transition-all duration-300 translate-y-8 opacity-0 pointer-events-auto w-full max-w-sm`;

    // SVGs for Success / Error
    const icons = {
        success: `<div class="flex-shrink-0 text-emerald-400 mt-0.5"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>`,
        error: `<div class="flex-shrink-0 text-rose-400 mt-0.5"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>`,
        info: `<div class="flex-shrink-0 text-sky-400 mt-0.5"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 18a6 6 0 100-12 6 6 0 000 12z"></path></svg></div>`
    };

    toast.innerHTML = `
        ${icons[type] || icons.success}
        <div class="flex-1 break-words">${escapeHtml(message)}</div>
        <button class="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none p-1 -m-1" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    `;

    container.appendChild(toast);

    // Slide In Animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-8', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });
    });

    // Slide Out & Remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-8', 'opacity-0');
            // Wait for the CSS transition to finish before removing from DOM
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300); 
        }
    }, 3000);
}

/**
 * Shows the loading overlay in the login modal.
 * @param {string} [message="Processing..."] - The message to display.
 */
function showLoginLoading(message = "Processing...") {
    const overlay = document.getElementById('loginLoadingOverlay');
    const text = document.getElementById('loginLoadingText');
    if (overlay) {
        if (text) text.textContent = message;
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        overlay.style.display = ''; // Reset any inline styles
    }
}

/** Hides the loading overlay in the login modal. */
function hideLoginLoading() {
    const overlay = document.getElementById('loginLoadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        overlay.style.display = 'none'; // Force hide
    }
}

/**
 * Generic wrapper to handle loading states for any async operation.
 * Guarantees the loading UI is hidden when the operation completes or fails.
 * @param {string} loadingMessage - The message to show in the loading overlay.
 * @param {Function} operation - The async function to execute.
 */
async function withAuthLoading(loadingMessage, operation) {
    const overlay = document.getElementById('loginLoadingOverlay');
    if (overlay) overlay.style.display = ''; // Reset any inline styles
    
    showLoginLoading(loadingMessage);
    try {
        await operation();
    } finally {
        hideLoginLoading();
        if (overlay) overlay.style.display = 'none'; // Force hide
    }
}

/**
 * Inspects `user.providerData` and returns booleans the UI can use to render provider-specific states.
 * @param {import("firebase/auth").User | null} user
 * @returns {{isGoogleLinked: boolean, isGithubLinked: boolean, isEmailLinked: boolean, primaryProviderId: string | null}}
 */
function getLinkedProviderState(user) {
    if (!user) {
        return {
            isGoogleLinked: false,
            isGithubLinked: false,
            isEmailLinked: false,
            primaryProviderId: null
        };
    }
    const providerIds = new Set(user.providerData.map(p => p.providerId));
    return {
        isGoogleLinked: providerIds.has('google.com'),
        isGithubLinked: providerIds.has('github.com'),
        isEmailLinked: providerIds.has('password'),
        primaryProviderId: user.providerData[0]?.providerId || null
    };
}

/**
 * Deprecated no-op: GitHub tokens should not be persisted from the browser.
 * @param {import("firebase/auth").User} user The user to save the token for.
 * @param {string} token The GitHub OAuth access token.
 */
async function saveGithubToken(user, token) {
    return;
}

/**
 * Deprecated no-op kept for existing auth flow compatibility.
 * Persists the GitHub access token to sessionStorage for rate-limit bypassing.
 * @param {import("firebase/auth").User} user
 * @param {import("firebase/auth").OAuthCredential | null} credential
 */
async function persistGithubAccessToken(user, credential) {
    return;
    if (credential && credential.accessToken) {
        sessionStorage.setItem('gh_token', credential.accessToken);
    }
}

/** Maps Firebase provider IDs to human-readable labels for UI badges. */
function describeProvider(providerId) {
    switch (providerId) {
        case 'google.com':
            return 'Google';
        case 'github.com':
            return 'GitHub';
        case 'password':
            return 'Email & Password';
        default:
            return providerId || 'Unknown';
    }
}

/** Prefills the email/password login form so a user can complete a linking flow quickly. */
function focusPasswordLoginForm(email) {
    if (typeof window !== 'undefined' && typeof window.toggleView === 'function') {
        window.toggleView('loginView');
    }
    const emailInput = document.getElementById('authEmail');
    if (emailInput) {
        emailInput.value = email || emailInput.value;
    }
    document.getElementById('authPass')?.focus();
}

/**
 * If a GitHub credential is waiting to be linked (email/password flow), attach it now.
 * @param {import("firebase/auth").User} user
 */
async function linkPendingGithubCredential(user) {
    if (!pendingCredentialForLinking) return false;
    const credential = pendingCredentialForLinking;
    await linkWithCredential(user, credential);
    await persistGithubAccessToken(user, credential);
    pendingCredentialForLinking = null;
    return true;
}

/**
 * Shows a glassmorphism welcome toast notification with an automatic slide-in/out animation.
 */
function showWelcomeNotification(userName) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-5 right-5 bg-slate-900/90 backdrop-blur-lg shadow-2xl rounded-r-xl rounded-l-sm p-4 border-l-4 border-blue-500 z-[10000] max-w-sm transition-all duration-500 transform translate-x-full opacity-0 flex items-center gap-3';
    
    notification.innerHTML = `
        <div class="bg-blue-500/20 text-blue-400 p-2 rounded-full flex-shrink-0">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <div>
            <h4 class="font-bold text-sm text-white">Welcome back, ${userName}! 👋</h4>
            <p class="text-xs text-slate-300 mt-0.5">You've successfully logged in.</p>
        </div>
    `;

    document.body.appendChild(notification);
    
    // Animate In
    requestAnimationFrame(() => {
        setTimeout(() => notification.classList.remove('translate-x-full', 'opacity-0'), 100);
    });

    // Animate Out and Remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => { if (document.body.contains(notification)) notification.remove(); }, 500);
        }
    }, 5000);
}

/**
 * Handles user data storage after a successful login (Google, GitHub, Email).
 * @param {import("firebase/auth").User} user - The Firebase Auth user object
 * @param {string} [customProvider] - Optional manual provider override
 */
async function handleUserLogin(user, customProvider = null) {
    if (!user || !user.uid) {
        console.error("Invalid user object passed to handleUserLogin.");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log("New user detected. Creating Firestore document...");
            const providerId = customProvider || (user.providerData.length > 0 ? user.providerData[0].providerId : 'email');

            await setDoc(userRef, {
                name: user.displayName || user.email?.split('@')[0] || "Unknown User",
                email: user.email || "No Email Provided",
                photoURL: user.photoURL || "",
                provider: providerId,
                joinedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                welcomeEmailSent: true
            });

            // Trigger EmailJS safely
            if (user.email) {
                const templateParams = {
                    to_name: user.displayName || user.email.split('@')[0] || 'Developer',
                    to_email: user.email,
                    from_name: "GitDelivr Support", 
                    reply_to: "support@gitdelivr.in"
                };

                emailjs.send('service_uxnnkzi', 'template_l3fl00f', templateParams)
                    .then(() => console.log('Welcome email sent successfully! ✅'))
                    .catch((error) => console.error('EmailJS Error: Failed to send welcome email. ❌', error));
            }
        } else {
            console.log("Returning user detected. Updating lastLogin timestamp...");
            await updateDoc(userRef, {
                lastLogin: serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error in handleUserLogin:", error.message);
    }
}

/**
 * Finalizes a successful GitHub popup login: persist token, send welcome email, close modal.
 * @param {import("firebase/auth").UserCredential} result
 */
async function finalizeGithubSignIn(result) {
    const user = result.user;
    
    // 1. Unified login data handling
    await handleUserLogin(user, 'github.com');

    // 2. Token Persistence
    const credential = GithubAuthProvider.credentialFromResult(result);
    await persistGithubAccessToken(user, credential);

    // 3. UI Cleanup
    hideLoginLoading();
    if (typeof closeModal === 'function') {
        closeModal('loginModal');
    }

    // 4. Show Welcome Notification
    const userName = user.displayName || user.email?.split('@')[0] || 'Developer';
    showWelcomeNotification(userName);
}
/**
 * Handles auth/account-exists-with-different-credential by guiding the user through linking flows.
 * @param {import("firebase/auth").AuthError} error
 */
async function handleAccountExistsWithDifferentCredential(error) {
    const email = error.customData?.email;
    const pendingCred = GithubAuthProvider.credentialFromError(error);
    if (!email || !pendingCred) {
        hideLoginLoading();
        throw error;
    }

    showLoginLoading("Checking existing providers...");
    const methods = await fetchSignInMethodsForEmail(auth, email);

    // Case 1: The existing account uses Google.
    // We must sign in with Google first, then link the pending GitHub credential.
    if (methods.includes('google.com')) {
        alert("This email is already registered via Google. Please complete Google sign-in so we can link GitHub.");
        showLoginLoading("Linking GitHub to your Google account...");
        const googleResult = await signInWithPopup(auth, googleProvider);
        await linkWithCredential(googleResult.user, pendingCred);
        await persistGithubAccessToken(googleResult.user, pendingCred);
        await handleUserLogin(googleResult.user, 'google.com');
        hideLoginLoading();
        showToast("Success! Your Google and GitHub accounts are now linked.", "success");
        if (typeof closeModal === 'function') closeModal('loginModal');
        return;
    }

    // Case 2: The existing account uses Email/Password.
    // We guide the user to the password login form to authenticate, then link GitHub.
    if (methods.includes('password')) {
        hideLoginLoading();
        showToast("An email/password account already exists. Please log in to finish linking.", "info");
        pendingCredentialForLinking = pendingCred;
        focusPasswordLoginForm(email);
        return;
    }

    hideLoginLoading();
    const providerHint = describeProvider(methods[0]);
    showToast(`Already connected with ${providerHint}. Sign in with that first.`, "error");
}

/**
 * Manually links a GitHub account to the currently signed-in user.
 * This is for users who are already logged in (e.g., via Google) and want to connect GitHub.
 */
async function connectGithubAccount() {
    const user = auth.currentUser;
    if (!user) {
        showToast("You must be logged in to connect a GitHub account.", "error");
        openModal('loginModal');
        return;
    }

    showLoginLoading("Connecting to GitHub...");
    try {
        const result = await linkWithPopup(user, githubProvider);
        
        // After linking, extract and persist the GitHub access token.
        const credential = GithubAuthProvider.credentialFromResult(result);
        await persistGithubAccessToken(user, credential);
        
        console.log("GitHub account successfully linked!", result);
        hideLoginLoading();
        
        const profile = result.user.providerData.find(p => p.providerId === 'github.com');
        const additionalInfo = getAdditionalUserInfo(result);
        const githubUsername = additionalInfo?.username || 'N/A';
        showToast(`Your GitHub account (@${githubUsername}) has been connected!`, "success");
        
        // Refresh UI state by re-fetching repos
        const btnTopLinkGithub = document.getElementById('btnTopLinkGithub');
        if (btnTopLinkGithub) btnTopLinkGithub.classList.add('hidden');
        
        fetchGitHubRepos(user);

    } catch (error) {
        hideLoginLoading();
        // This error occurs if the GitHub account is already linked to another Firebase user.
        if (error.code === 'auth/credential-already-in-use') {
            showToast("This GitHub account is already linked to another user.", "error");
        } else if (error.code === 'auth/provider-already-linked') {
            // This can happen if the UI state is out of sync and the user clicks "Connect" again.
            // Provide a more helpful message instead of the generic fallback.
            console.warn("Attempted to link a provider that is already linked.");
            showToast("This GitHub account is already connected to your profile.", "info");
        } else if (error.code !== 'auth/popup-closed-by-user') {
            console.error("Error linking GitHub account:", error);
            showToast("Could not connect GitHub account. Please try again.", "error");
        }
    }
}

/**
 * Handles the GitHub sign-in process, including linking the account if the
 * user's email already exists with a different provider.
 */
async function signInWithGitHubAndLink() {
    try {
        await withAuthLoading("Connecting to GitHub...", async () => {
            try {
                const result = await signInWithPopup(auth, githubProvider);
                console.log("Successfully signed in with GitHub:", result.user?.uid);
                await finalizeGithubSignIn(result);
            } catch (error) {
                if (error.code === 'auth/account-exists-with-different-credential') {
                    await handleAccountExistsWithDifferentCredential(error);
                    return;
                }
                throw error; // Pass to outer catch
            }
        });
    } catch (error) {
        console.error("Error during GitHub sign-in:", error);
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return;
        }
        if (error.code === 'auth/popup-blocked-by-browser') {
            showToast("Popup blocked by your browser. Please allow popups.", "error");
        } else if (error.code === 'auth/unauthorized-domain') {
            console.error("Developer Info: Make sure your domain is added to the authorized domains in the Firebase console.");
            showToast("This domain is not authorized for sign-in.", "error");
        } else {
            showToast(error.message || "GitHub sign-in failed. Please try again.", "error");
        }
    }
}

// --- Theme Logic ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme, false);
}

function setTheme(theme, save = true) {
    if (save) localStorage.setItem('theme', theme);
    
    // Update UI buttons
    document.querySelectorAll('.theme-selector').forEach(btn => {
        btn.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500');
        btn.classList.add('border-slate-200', 'dark:border-slate-700');
    });
    const activeBtn = document.getElementById(`btn-${theme}`);
    if (activeBtn) {
        activeBtn.classList.remove('border-slate-200', 'dark:border-slate-700');
        activeBtn.classList.add('border-blue-500', 'ring-2', 'ring-blue-500');
    }

    // Apply Theme
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// Listen for system changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (localStorage.getItem('theme') === 'system') {
            setTheme('system', false);
        }
    });
}

// Initialize Theme
initTheme();

// Utilities
const escapeHtmlForOnclick = escapeJsStringForOnclick;

// --- SRI Cache & Utilities ---
window.sriCache = {};
window.generateSRIHash = async function(url) {
    if (window.sriCache[url]) return window.sriCache[url];

    async function computeHash(fetchUrl) {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error("Fetch failed with status " + res.status);
        const buffer = await res.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
        return `sha384-${hashBase64}`;
    }

    try {
        const hash = await computeHash(url);
        window.sriCache[url] = hash;
        return hash;
    } catch(e) {
        console.warn("Direct SRI Hash generation failed (likely CORS). Attempting via proxy...", e);
        try {
            const proxyUrl = `https://cdn.gitdelivr.in/proxy?url=${encodeURIComponent(url)}`;
            const hash = await computeHash(proxyUrl);
            window.sriCache[url] = hash; // Cache against original URL
            return hash;
        } catch (proxyError) {
            console.error("Proxy SRI Hash generation also failed:", proxyError);
            return { error: "File inaccessible or blocked. Cannot generate SRI hash." };
        }
    }
};

window.getBaseTag = function(link, ext, name, hash = "") {
    let integrityStr = hash ? ` integrity="${hash}" crossorigin="anonymous"` : "";
    if (ext === "js" || ext === "mjs") return `<script src="${link}"${integrityStr}><\/script>`;
    if (ext === "css") return `<link rel="stylesheet" href="${link}"${integrityStr}>`;
    if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return `<img src="${link}" alt="${name}"${integrityStr}>`;
    if (["mp4", "webm", "ogg"].includes(ext)) return `<video controls preload="metadata" style="width: 100%; border-radius: 8px;"${integrityStr}>\n  <source src="${link}">\n</video>`;
    if (["mp3", "wav", "aac"].includes(ext)) return `<audio controls preload="metadata" style="width: 100%; border-radius: 8px;"${integrityStr}>\n  <source src="${link}">\n</audio>`;
    return "";
};

window.toggleSRIInTag = function(link, ext, name) {
    const toggle = document.getElementById('sriToggleLink');
    const input = document.getElementById('generatedHtmlTag');
    const statusBadge = document.getElementById('sriBadgeContainer');
    
    if (toggle && toggle.checked && window.currentGeneratedHash) {
        input.value = window.getBaseTag(link, ext, name, window.currentGeneratedHash);
        statusBadge.innerHTML = `<span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-md ml-2 font-bold border border-green-200 flex items-center gap-1" title="SRI ensures your website loads exactly the file we serve, preventing unauthorized modifications."><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> SRI Secured</span>`;
    } else {
        input.value = window.getBaseTag(link, ext, name, "");
        statusBadge.innerHTML = "";
    }
};

// --- URL AUTO-FILL ---
function parseGitHubUrl(url) {
    url = url.trim();
    if (!url) return;
    
    // Smart URL Parser (Universal Strategy)
    // If the user types a single word (e.g., 'bootstrap', 'jquery') instead of a URL
    if (!url.includes('/') && !url.includes('http')) {
        const sourceProviderEl = document.getElementById('sourceProvider');
        if (sourceProviderEl) {
            // Auto-switch to NPM for single-word package names
            sourceProviderEl.value = "npm";
            sourceProviderEl.dispatchEvent(new Event('change'));
        }
        document.getElementById('user').value = url;
        document.getElementById('repo').value = "latest";
        
        const statusMsg = document.getElementById("status-message");
        if (statusMsg) {
            statusMsg.textContent = "Smart Match: Switched to NPM registry for package search.";
            statusMsg.className = "mt-4 text-center text-sm text-blue-600 dark:text-blue-400 font-medium animate-pulse";
        }
        return;
    }

    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const sourceProviderEl = document.getElementById('sourceProvider');
        
        if (urlObj.hostname.includes("github.com")) {
            if (sourceProviderEl) sourceProviderEl.value = "gh";
            if (pathParts.length >= 2) {
                document.getElementById('user').value = pathParts[0];
                document.getElementById('repo').value = pathParts[1];
                if (pathParts.length >= 4 && (pathParts[2] === 'tree' || pathParts[2] === 'blob')) {
                    document.getElementById('branch').value = pathParts[3];
                } else if (!document.getElementById('branch').value) {
                    document.getElementById('branch').value = 'main';
                }
            }
        } else if (urlObj.hostname.includes("gitlab.com")) {
            if (sourceProviderEl) {
                sourceProviderEl.value = "gl";
                sourceProviderEl.dispatchEvent(new Event('change'));
            }
            if (pathParts.length >= 2) {
                document.getElementById('user').value = pathParts[0];
                document.getElementById('repo').value = pathParts[1];
                if (pathParts.length >= 4 && pathParts[2] === '-' && (pathParts[3] === 'tree' || pathParts[3] === 'blob')) {
                    document.getElementById('branch').value = pathParts[4];
                } else if (!document.getElementById('branch').value) {
                    document.getElementById('branch').value = 'main';
                }
            }
        } else if (urlObj.hostname.includes("bitbucket.org")) {
            if (sourceProviderEl) {
                sourceProviderEl.value = "bb";
                sourceProviderEl.dispatchEvent(new Event('change'));
            }
            if (pathParts.length >= 2) {
                document.getElementById('user').value = pathParts[0];
                document.getElementById('repo').value = pathParts[1];
                if (pathParts.length >= 4 && (pathParts[2] === 'src' || pathParts[2] === 'raw')) {
                    document.getElementById('branch').value = pathParts[3];
                } else if (!document.getElementById('branch').value) {
                    document.getElementById('branch').value = 'master';
                }
            }
        } else if (urlObj.hostname.includes("wordpress.org")) {
            if (sourceProviderEl) {
                sourceProviderEl.value = "wp";
                sourceProviderEl.dispatchEvent(new Event('change'));
            }
            if (pathParts.length >= 2) {
                document.getElementById('user').value = pathParts[0]; // 'plugins' or 'themes'
                document.getElementById('repo').value = pathParts[1]; // slug
                document.getElementById('branch').value = "trunk";
            }
        }
    } catch (e) {
        const statusMsg = document.getElementById("status-message");
        if (statusMsg) {
            statusMsg.textContent = "Invalid URL format detected.";
            statusMsg.className = "mt-4 text-center text-sm text-red-500 font-medium";
        }
    }
}

// --- DYNAMIC BRANCH FETCHING ---
async function fetchBranches() {
    const user = document.getElementById("user").value.trim();
    const repo = document.getElementById("repo").value.trim();
    const token = document.getElementById("token")?.value.trim() || sessionStorage.getItem('gh_token') || "";
    const sourceProviderEl = document.getElementById("sourceProvider");
    const source = sourceProviderEl ? sourceProviderEl.value : "gh";
    const branchInput = document.getElementById("branch");

    if (!user || !repo || !branchInput) return;

    branchInput.placeholder = "Loading branches...";

    let apiUrl = "";
    let headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (source === "gh") {
        apiUrl = `https://api.github.com/repos/${user}/${repo}/branches?per_page=100`;
        if (token) headers = { Authorization: `token ${token}` };
    } else if (source === "gl") {
        const projectId = encodeURIComponent(`${user}/${repo}`);
        apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/branches`;
    } else if (source === "bb") {
        apiUrl = `https://api.bitbucket.org/2.0/repositories/${user}/${repo}/refs/branches`;
    }

    try {
        const res = await fetch(apiUrl, { headers });
        if (!res.ok) throw new Error("Failed to fetch branches");
        
        const data = await res.json();
        let branches = [];

        if (source === "gh" || source === "gl") {
            branches = data.map(b => b.name);
        } else if (source === "bb") {
            branches = data.values.map(b => b.name);
        }

        if (branches.length > 0) {
            let datalist = document.getElementById("branch-list");
            if (!datalist) {
                datalist = document.createElement("datalist");
                datalist.id = "branch-list";
                document.body.appendChild(datalist);
                branchInput.setAttribute("list", "branch-list");
            }
            datalist.innerHTML = branches.map(b => `<option value="${b}">${b}</option>`).join("");
            branchInput.placeholder = branches.includes('main') ? 'main' : (branches.includes('master') ? 'master' : branches[0]);
        }
    } catch (e) {
        console.warn("Could not load branches dynamically:", e);
        branchInput.placeholder = "main";
    }
}

// --- CORE LOGIC (API Fetching & File Browser) ---
async function fetchFiles() {
    if (!auth.currentUser) {
        if (typeof openModal === 'function') {
            openModal('loginModal');
        } else {
            statusMessage.innerHTML = `
                <span class="text-red-500 font-bold">Login Required</span> 
                <button id="quickLoginBtn" class="ml-2 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-700 transition">
                    Login with GitHub
                </button>
            `;
            document.getElementById('quickLoginBtn').onclick = async () => {
                try {
                    await signInWithPopup(auth, new GithubAuthProvider());
                    fetchFiles();
                } catch (e) { alert("Login failed: " + e.message); }
            };
        }
        return;
    }

    const user = document.getElementById("user").value.trim();
    const repo = document.getElementById("repo").value.trim();
    const branch = document.getElementById("branch").value.trim() || "main";
    const token = document.getElementById("token")?.value.trim() || sessionStorage.getItem('gh_token') || "";

    if (!user || !repo) {
        statusMessage.textContent = "Username and Repository Name are required.";
        return;
    }

    const sourceProviderEl = document.getElementById("sourceProvider");
    const source = sourceProviderEl ? sourceProviderEl.value : "gh";
    currentRepoInfo = { user, repo, branch, file: "", source };

    statusMessage.textContent = "Fetching repository data...";
    statusMessage.className = "mt-4 text-center text-sm text-slate-500 font-medium animate-pulse";
    fileBrowser.classList.add("hidden");
    outputContainer.classList.add("hidden");

    let headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (source === "gh" && token) headers = { Authorization: `token ${token}` };

    try {
        let files = [];
        let isTruncated = false;

        if (source === "gh") {
            const apiUrl = `https://api.github.com/repos/${user}/${repo}/git/trees/${branch}?recursive=1`;
            const res = await fetch(apiUrl, { headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message === "Bad credentials" ? "❌ Invalid Token." : (data.message || `API Error: ${res.status}`));
            if (!data.tree) throw new Error("Invalid repo details");
            files = data.tree.filter(f => f.type === "blob");
            isTruncated = data.truncated;
        } else if (source === "gl") {
            const projectId = encodeURIComponent(`${user}/${repo}`);
            let apiUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true&ref=${branch}&per_page=100`;
            while (apiUrl) {
                const res = await fetch(apiUrl, { headers });
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Invalid repo details");
                files.push(...data.filter(f => f.type === "blob"));
                const nextPage = res.headers.get("x-next-page");
                apiUrl = nextPage ? `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true&ref=${branch}&per_page=100&page=${nextPage}` : null;
            }
        } else if (source === "bb") {
            let apiUrl = `https://api.bitbucket.org/2.0/repositories/${user}/${repo}/src/${branch}/?pagelen=100`;
            while (apiUrl) {
                const res = await fetch(apiUrl, { headers });
                if (!res.ok) throw new Error(`API Error: ${res.status}`);
                const data = await res.json();
                if (!data.values) throw new Error("Invalid repo details");
                files.push(...data.values.filter(f => f.type === "commit_file").map(f => ({ path: f.path })));
                apiUrl = data.next || null;
                if (files.length > 1000) break; // Limit to 1000 for Bitbucket to avoid excessive nested fetches
            }
        } else if (source === "npm") {
            const apiUrl = `https://data.jsdelivr.com/v1/package/npm/${user}@${repo || 'latest'}/flat`;
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            const data = await res.json();
            if (!data.files) throw new Error("Invalid NPM package details");
            files = data.files.map(f => ({ path: f.name.replace(/^\//, '') }));
        } else if (source === "wp") {
            const targetVersion = (!branch || branch === 'trunk' || branch === 'main') ? 'latest' : branch;
            const apiUrl = `https://data.jsdelivr.com/v1/package/wp/${user}/${repo}@${targetVersion}/flat`;
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error(`API Error: ${res.status} (Ensure the plugin/theme exists on WordPress.org)`);
            const data = await res.json();
            if (!data.files) throw new Error("Invalid WordPress package details");
            files = data.files.map(f => ({ path: f.name.replace(/^\//, '') }));
        }

        fileCache = files;
        renderFileList(fileCache, user, repo, branch);
        
        let successMsg = `Success! Found ${fileCache.length} files.`;
        if (isTruncated) successMsg += ` (Warning: Repo is very large, some files were truncated by GitHub.)`;
        statusMessage.textContent = successMsg;
        statusMessage.className = `mt-4 text-center text-sm ${isTruncated ? 'text-yellow-500' : 'text-green-600 dark:text-green-400'} font-medium`;
        
        fileBrowser.classList.remove("hidden");
        document.getElementById("search").value = "";
        zipButton.disabled = fileCache.length === 0;

    } catch (err) {
        let errorMsg = err.message;
        if (err.name === 'TypeError' || errorMsg.includes('Failed to fetch')) {
            errorMsg = "❌ Network Error: Could not connect to the API. Please check your internet connection.";
        }
        statusMessage.textContent = errorMsg;
        statusMessage.className = "mt-4 text-center text-sm text-red-500 dark:text-red-400 font-medium";
    }
}

function renderFileList(files, user, repo, branch) {
    const list = document.getElementById("fileList");
    if (!files || !files.length) {
        list.innerHTML = `<li class="p-4 text-center text-slate-500">No files found.</li>`;
        return;
    }

    // Performance Optimization: Render a maximum of 500 files at once to prevent browser freezing.
    const maxRender = 500;
    const displayFiles = files.slice(0, maxRender);
    
    let html = displayFiles.map(f => {
        return `<li class="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition duration-150 border-b border-slate-100 dark:border-slate-700/50">
            <span class="truncate pr-4 text-sm font-mono text-slate-700 dark:text-slate-300" style="max-width: 70%;" title="${escapeHtmlAttribute(f.path)}">
                📄 ${escapeHtml(f.path)}
            </span>
            <button class="flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm hover:shadow-md hover:-translate-y-0.5" onclick="showCDN('${escapeHtmlForOnclick(f.path)}')">Generate Link</button>
        </li>`;
    }).join('');

    if (files.length > maxRender) {
        html += `<li class="p-4 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/50">Showing first ${maxRender} of ${files.length} files. Use the search bar to filter and find specific files.</li>`;
    }

    list.innerHTML = html;
}

async function showCDN(path) {
    outputContainer.classList.remove("hidden");
    if (aiSection) aiSection.classList.remove("hidden");
    if (aiOutputContainer) aiOutputContainer.classList.add("hidden");

    const providerEl = document.getElementById("cdnProvider");
    const provider = providerEl ? providerEl.value : "gitdelivr";
    const { user, repo, branch, source } = currentRepoInfo;
    const currentSource = source || "gh";
    
    let finalPath = path;
    const minifyToggle = document.getElementById("autoMinifyToggle");
    if (minifyToggle && minifyToggle.checked && (currentSource === 'npm' || currentSource === 'wp')) {
        const ext = path.split('.').pop().toLowerCase();
        if ((ext === 'js' || ext === 'css') && !path.endsWith(`.min.${ext}`)) {
            finalPath = path.replace(new RegExp(`\\.${ext}$`), `.min.${ext}`);
        }
    }

    let cdnLink = "";
// --- showCDN function ke andar badlein ---
if (currentSource === "gh") {
    if (provider === "jsdelivr") {
        cdnLink = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${finalPath}`;
    } else if (provider === "statically") {
        cdnLink = `https://cdn.statically.io/gh/${user}/${repo}/${branch}/${finalPath}`;
    } else {
        // Naya clean format bina @ ke:
        cdnLink = `https://cdn.gitdelivr.in/gh/${user}/${repo}/${branch}/${finalPath}`;
    }
} else if (currentSource === "gl") {
    cdnLink = `https://cdn.gitdelivr.in/gl/${user}/${repo}/${branch}/${finalPath}`;
} else if (currentSource === "bb") {
    cdnLink = `https://cdn.gitdelivr.in/bb/${user}/${repo}/${branch}/${finalPath}`;
} else if (currentSource === "wp") {
    cdnLink = `https://cdn.gitdelivr.in/wp/${user}/${repo}/${branch}/${finalPath}`;
}
    currentCdnLink = cdnLink;
    currentRepoInfo.file = finalPath;
    window.currentGeneratedHash = ""; // Reset for new file

    const isSriEnabledGlobal = document.getElementById('enableSriHashGlobal')?.checked;

    if (auth.currentUser) {
        addDoc(collection(db, "history"), {
            userId: auth.currentUser.uid,
            repo: currentRepoInfo.repo,
            file: path,
            link: cdnLink,
            provider: provider,
            timestamp: serverTimestamp()
        }).catch(e => console.error("Error saving history:", e));
    }

    const output = document.getElementById("output");
    const ext = finalPath.split('.').pop().toLowerCase();
    const fileName = finalPath.split('/').pop();
    const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);

    let tagValue = window.getBaseTag(cdnLink, ext, fileName, "");
    const safeTag = escapeHtmlAttribute(tagValue);
    const safeLink = escapeHtmlAttribute(cdnLink);
    const safeFileName = escapeHtml(fileName);
    const safeFileNameAttr = escapeHtmlAttribute(fileName);
    const safeCdnLink = escapeHtmlAttribute(cdnLink);
    const safeCdnOnclick = escapeHtmlForOnclick(cdnLink);
    const safeExtOnclick = escapeHtmlForOnclick(ext);
    const safeFileNameOnclick = escapeHtmlForOnclick(fileName);

    output.innerHTML = `
        <p class="text-sm text-slate-600 dark:text-slate-300"><span class="font-bold">File:</span> ${safeFileName}</p>
        <div class="space-y-2 pt-2">
            <p class="font-bold text-xs uppercase text-slate-500 tracking-wide">CDN Link</p>
            <div class="flex shadow-sm hover:shadow-md transition-shadow rounded-2xl"><input value="${safeCdnLink}" readonly class="flex-grow p-4 border border-slate-200 dark:border-slate-700 rounded-l-2xl bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 truncate outline-none focus:bg-white dark:focus:bg-slate-900"><button class="bg-slate-200 dark:bg-slate-700 p-4 rounded-r-2xl hover:bg-slate-300 dark:hover:bg-slate-600 transition flex items-center justify-center border-y border-r border-slate-200 dark:border-slate-700" onclick="copyToClipboard('${safeCdnOnclick}')"><svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div>
        </div>
        
        ${isSriEnabledGlobal ? `<div class="space-y-2 pt-4">
            <p class="font-bold text-xs uppercase text-slate-500 tracking-wide">SRI Hash</p>
            <div class="flex shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <input type="text" id="globalSriInput" value="Generating..." readonly class="flex-grow p-4 border border-slate-200 dark:border-slate-700 rounded-l-2xl bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300 font-mono truncate outline-none focus:bg-white dark:focus:bg-slate-900">
                <button class="bg-slate-200 dark:bg-slate-700 p-4 rounded-r-2xl hover:bg-slate-300 dark:hover:bg-slate-600 transition flex items-center justify-center border-y border-r border-slate-200 dark:border-slate-700" onclick="copyToClipboard(document.getElementById('globalSriInput').value)">
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </button>
            </div>
        </div>` : ''}
        
        ${tagValue ? `<div class="space-y-2 pt-4">
            <div class="flex items-center justify-between mb-2">
                <p class="font-bold text-xs uppercase text-slate-500 tracking-wide flex items-center">
                    SRI Hash
                </p>
                <div class="flex items-center gap-2" title="SRI ensures your website loads exactly the file we serve, preventing unauthorized modifications.">
                    <label class="relative inline-flex items-center cursor-pointer group">
                        <input type="checkbox" id="sriToggleLink" class="sr-only peer" disabled onchange="window.toggleSRIInTag('${safeCdnOnclick}', '${safeExtOnclick}', '${safeFileNameOnclick}')">
                        <div class="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
                        <span class="ml-2 text-xs font-bold text-slate-600 dark:text-slate-300">Enable SRI Protection</span>
                    </label>
                </div>
            </div>
            <div id="sriHashDisplay" class="p-3 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-500 flex items-center justify-center shadow-lg transition-all">
                <svg class="animate-spin w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Generating Security Hash...
            </div>
        </div>
        <div class="space-y-2 pt-4">
            <p class="font-bold text-xs uppercase text-slate-500 tracking-wide flex items-center">
                HTML Tag <span id="sriBadgeContainer"></span>
            </p>
            <div class="flex shadow-sm hover:shadow-md transition-shadow rounded-2xl"><input id="generatedHtmlTag" value='${safeTag}' readonly class="flex-grow p-4 border border-slate-200 dark:border-slate-700 rounded-l-2xl bg-slate-50/50 dark:bg-slate-900/50 text-sm text-blue-600 dark:text-blue-400 font-mono truncate outline-none focus:bg-white dark:focus:bg-slate-900"><button id="copyTagBtn" class="bg-slate-200 dark:bg-slate-700 p-4 rounded-r-2xl hover:bg-slate-300 dark:hover:bg-slate-600 transition flex items-center justify-center border-y border-r border-slate-200 dark:border-slate-700" onclick="copyToClipboard(document.getElementById('generatedHtmlTag').value)"><svg class="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button></div>
        </div>` : ''}
        ${isImage ? `<div class="mt-6 p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center"><img src="${safeCdnLink}" alt="Preview" class="max-w-full max-h-64 object-contain rounded-lg shadow-sm"></div>` : ''}
        <a class="inline-flex items-center mt-6 text-emerald-600 dark:text-emerald-400 hover:underline text-sm font-medium" href="${safeCdnLink}" download="${safeFileNameAttr}"><svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Download File</a>
    `;

    // Trigger Background SRI Calculation
    if (tagValue || isSriEnabledGlobal) {
        window.generateSRIHash(cdnLink).then(hashResult => {
            const globalInput = document.getElementById('globalSriInput');
            if (globalInput) {
                if (hashResult.error) {
                    globalInput.value = hashResult.error;
                    globalInput.classList.remove('text-slate-600', 'dark:text-slate-300');
                    globalInput.classList.add('text-red-500', 'dark:text-red-400');
                } else {
                    globalInput.value = hashResult;
                }
            }

            const display = document.getElementById('sriHashDisplay');
            const toggle = document.getElementById('sriToggleLink');
            if (display) {
                if (hashResult.error) {
                    display.innerHTML = `<span class="text-red-500 font-medium">${hashResult.error}</span>`;
                } else {
                    display.innerHTML = `<span class="text-green-600 dark:text-green-400 break-all select-all font-bold">${hashResult}</span>`;
                    window.currentGeneratedHash = hashResult;
                    if (toggle) {
                        toggle.disabled = false;
                        if (isSriEnabledGlobal) {
                            toggle.checked = true;
                            window.toggleSRIInTag(cdnLink, ext, fileName);
                        }
                    }
                }
            } else if (hashResult && !hashResult.error) {
                window.currentGeneratedHash = hashResult;
            }
        });
    }
    outputContainer.scrollIntoView({ behavior: 'smooth' });
}

// --- ZIP & UTILS ---
async function downloadAllAsZip() {
    if (!fileCache.length) return;
    const user = document.getElementById("user").value.trim();
    const repo = document.getElementById("repo").value.trim();
    const branch = document.getElementById("branch").value.trim() || "main";
    const zip = new JSZip();
    let processed = 0;
    
    zipButton.disabled = true;
    zipButton.textContent = "Preparing...";

    // Process in conservative chunks of 10 to prevent browser Out-Of-Memory (OOM) crashes and network exhaustion
    const chunkSize = 10;
    
    for (let i = 0; i < fileCache.length; i += chunkSize) {
        const chunk = fileCache.slice(i, i + chunkSize);
        const promises = chunk.map(async (f) => {
            try {
                const url = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${f.path}`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.arrayBuffer();
                    zip.file(f.path, data);
                } else {
                    zip.file(f.path + ".error.txt", `HTTP Error ${res.status}`);
                }
            } catch (e) {
                zip.file(f.path + ".error.txt", e.message);
            } finally {
                processed++;
                zipButton.textContent = `Downloading (${Math.round((processed/fileCache.length)*100)}%)...`;
            }
        });
        // Wait for the current chunk to finish before starting the next batch
        await Promise.all(promises);
    }
    
    zipButton.textContent = "Generating ZIP...";
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${repo}-${branch}.zip`;
    link.click();
    
    // Clean up the object URL to free memory
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);

    zipButton.disabled = false;
    zipButton.textContent = "Download All Files as ZIP";
    showToast("Download Started!", "success");
}

function copyToClipboard(text) {
    // Modern approach using the Async Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast("Copied to clipboard!", "success"))
            .catch(() => showToast("Failed to copy.", "error"));
    } else {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        try { 
            document.execCommand('copy'); 
            showToast("Copied to clipboard!", "success"); 
        } catch(e) {
            showToast("Failed to copy.", "error");
        }
        document.body.removeChild(el);
    }
}

function filterFiles() {
    const key = document.getElementById("search").value.toLowerCase();
    const filtered = fileCache.filter(f => f.path.toLowerCase().includes(key));
    const user = document.getElementById("user").value;
    const repo = document.getElementById("repo").value;
    const branch = document.getElementById("branch").value || "main";
    renderFileList(filtered, user, repo, branch);
}

// =========================================================
// --- AI CHAT SUPPORT (CLOUDFLARE WORKER + GEMINI API) ---
// =========================================================

const chatToggleBtn = document.getElementById('chatToggleBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatWindow = document.getElementById('chatWindow');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const messagesContainer = document.getElementById('chatMessages');
const sendChatBtn = document.getElementById('sendChatBtn');

// Ensure the URL is absolute by including the protocol
const AI_WORKER_URL = 'https://chat.gitdelivr.in'; 

// Keep track of chat context
let conversationHistory = [];


if (chatToggleBtn && chatWindow) {
    const toggleChat = () => {
        chatWindow.classList.toggle('hidden');
        chatWindow.classList.toggle('flex');
        if (!chatWindow.classList.contains('hidden')) chatInput.focus();
    };

    chatToggleBtn.addEventListener('click', toggleChat);
    if (closeChatBtn) closeChatBtn.addEventListener('click', toggleChat);

    const appendMessage = (text, isUser = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
        
        const bubble = document.createElement('div');
        if (isUser) {
            bubble.className = `bg-blue-600 text-white text-sm p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm leading-relaxed whitespace-pre-wrap`;
            bubble.textContent = text; // Safe text
        } else {
            bubble.className = `bg-[#151e32] text-gray-300 text-sm p-3 rounded-2xl rounded-tl-sm border border-slate-700/50 max-w-[85%] shadow-sm leading-relaxed whitespace-pre-wrap`;
            bubble.textContent = text; 
        }
        
        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const showTypingIndicator = () => {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = id;
        msgDiv.className = `flex justify-start`;
        msgDiv.innerHTML = `
            <div class="bg-[#151e32] text-gray-400 text-xs p-4 rounded-2xl rounded-tl-sm border border-slate-700/50 shadow-sm flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        // 1. User Message UI
        appendMessage(message, true);
        chatInput.value = '';
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        sendChatBtn.classList.add('opacity-50');

        // 2. Show Typing Indicator
        const typingId = showTypingIndicator();

        try {
            // 3. Handle Network Errors Gracefully & Fetch from Worker
            let response;
            try {
                response = await fetch(AI_WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        message: message,
                        history: conversationHistory 
                    })
                });
            } catch (networkErr) {
                throw new Error("Network Error: Unable to reach the AI server. Please check your connection.");
            }

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();

            document.getElementById(typingId)?.remove();
            if (data.error) throw new Error(data.error);

            // 4. Bot Reply UI & History Update
            appendMessage(data.reply, false);
            
            conversationHistory.push({ role: 'user', text: message });
            conversationHistory.push({ role: 'model', text: data.reply });
            
            // Memory Management: Keep context tight (last 10 turns max) to save tokens
            if (conversationHistory.length > 20) conversationHistory = conversationHistory.slice(-20);

        } catch (error) {
            console.error("Chat Error:", error);
            document.getElementById(typingId)?.remove();
            appendMessage("⚠️ Sorry, our AI servers are currently resting. Please try again later.", false);
        } finally {
            chatInput.disabled = false;
            sendChatBtn.disabled = false;
            sendChatBtn.classList.remove('opacity-50');
            chatInput.focus();
        }
    });
}


// --- EXPOSE FUNCTIONS TO WINDOW ---
window.fetchFiles = fetchFiles;
window.filterFiles = filterFiles;
window.downloadAllAsZip = downloadAllAsZip;
window.showCDN = showCDN;
window.copyToClipboard = copyToClipboard;
window.parseGitHubUrl = parseGitHubUrl;
window.setTheme = setTheme;
window.signInWithGitHubAndLink = signInWithGitHubAndLink;
window.connectGithubAccount = connectGithubAccount;
window.showToast = showToast;
window.showLoginLoading = showLoginLoading;
window.hideLoginLoading = hideLoginLoading;

// =======================================================
// --- SITE ANALYZER DEEP SCAN LOGIC ---
// =======================================================

let siteAnalyzerChartInstance = null;
let isAnalyzing = false;

window.startSiteAnalysis = async function() {
    if (isAnalyzing) return;

    const urlInput = document.getElementById('analyzerTargetUrl');
    const targetUrl = urlInput?.value.trim();
    
    if (!targetUrl || !targetUrl.startsWith('http')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    isAnalyzing = true;

    // UI Elements
    const searchSec = document.getElementById('analyzerSearchSection');
    const scanSec = document.getElementById('analyzerScanningSection');
    const resSec = document.getElementById('analyzerResultsSection');
    const terminal = document.getElementById('analyzerTerminalOutput');

    if(searchSec) searchSec.classList.add('hidden');
    if(resSec) resSec.classList.add('hidden');
    if(scanSec) {
        scanSec.classList.remove('hidden');
        scanSec.classList.add('flex');
    }

    if(terminal) terminal.innerHTML = '';
    const log = (msg, isError = false) => {
        if(!terminal) return;
        const span = document.createElement('span');
        span.className = isError ? 'text-red-400' : 'text-green-400';
        span.innerText = `> ${msg}`;
        terminal.appendChild(span);
        terminal.scrollTop = terminal.scrollHeight;
    };

    log(`Initializing deep scan for: ${targetUrl}`);
    log('Connecting to Google PageSpeed Insights API...');

    try {
        // Append existing GCP API key to bypass strict unauthenticated rate limits
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&strategy=desktop&category=performance&category=accessibility&category=seo&key=AIzaSyC_U_pYSYWNm6Q1ufFwQE_tYlQZIYeDU0g`;
        
        // Keep the terminal looking active during the long fetch
        const loadingInterval = setInterval(() => {
            log('Analyzing DOM and Network payloads...');
        }, 4000);

        const response = await fetch(psiUrl);
        clearInterval(loadingInterval);

        if (!response.ok) throw new Error('API Request Failed (Rate Limit or Invalid URL)');
        const data = await response.json();

        log('Response received. Parsing Lighthouse metrics...');

        const lh = data.lighthouseResult;
        const score = Math.round(lh.categories.performance.score * 100);
        const a11yScore = lh.categories.accessibility ? Math.round(lh.categories.accessibility.score * 100) : 'N/A';
        const seoScore = lh.categories.seo ? Math.round(lh.categories.seo.score * 100) : 'N/A';
        const lcp = lh.audits['largest-contentful-paint'] ? lh.audits['largest-contentful-paint'].displayValue : 'N/A';
        const requests = lh.audits['network-requests']?.details?.items || [];

        // Filter for unoptimized external assets
        const targetOrigin = new URL(targetUrl).origin;
        const externalAssets = requests.filter(req => {
            try {
                const reqUrl = new URL(req.url);
                return reqUrl.origin !== targetOrigin && !reqUrl.href.startsWith('data:') && ['Script', 'Stylesheet', 'Image', 'Font'].includes(req.resourceType);
            } catch(e) { return false; }
        }).sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0)).slice(0, 6); 

        log('Analysis complete. Rendering results...');

        setTimeout(() => {
            renderAnalyzerResults(score, a11yScore, seoScore, lcp, externalAssets, targetUrl);
            if(scanSec) { scanSec.classList.remove('flex'); scanSec.classList.add('hidden'); }
            if(resSec) resSec.classList.remove('hidden');
            isAnalyzing = false;
        }, 1000);

    } catch (error) {
        console.error("Site Analyzer Error:", error);
        log('Error: Failed to reach analysis API. Falling back to simulated scan...', true);
        
        // Graceful Fallback simulation if Google API fails/rate-limits
        setTimeout(() => {
            renderAnalyzerResults(Math.floor(Math.random() * 30) + 40, Math.floor(Math.random() * 20) + 80, Math.floor(Math.random() * 20) + 80, '3.2 s', [
                { url: 'https://raw.githubusercontent.com/vendor/lib.js', resourceType: 'Script', transferSize: 150000, networkEndTime: 450 },
                { url: 'https://example.com/assets/style.css', resourceType: 'Stylesheet', transferSize: 85000, networkEndTime: 300 }
            ], targetUrl);
            if(scanSec) { scanSec.classList.remove('flex'); scanSec.classList.add('hidden'); }
            if(resSec) resSec.classList.remove('hidden');
            isAnalyzing = false;
        }, 2000);
    }
};

function renderAnalyzerResults(score, a11yScore, seoScore, lcp, assets, url) {
    const scoreVal = document.getElementById('analyzerScoreValue');
    const scoreLabel = document.getElementById('analyzerScoreLabel');
    const scoreCircle = document.getElementById('analyzerScoreCircle');

    const a11yVal = document.getElementById('analyzerA11yValue');
    const a11yLabel = document.getElementById('analyzerA11yLabel');
    const a11yCircle = document.getElementById('analyzerA11yCircle');

    const seoVal = document.getElementById('analyzerSeoValue');
    const seoLabel = document.getElementById('analyzerSeoLabel');
    const seoCircle = document.getElementById('analyzerSeoCircle');

    if(scoreVal) scoreVal.innerText = score;
    if(a11yVal) a11yVal.innerText = a11yScore;
    if(seoVal) seoVal.innerText = seoScore;
    
    let color = '#ef4444'; // Red
    let label = 'Poor Optimization';
    let labelClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';

    if (score >= 90) {
        color = '#22c55e'; // Green
        label = 'Excellent';
        labelClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20';
    } else if (score >= 50) {
        color = '#eab308'; // Yellow
        label = 'Needs Improvement';
        labelClass = 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20';
    }

    if(scoreCircle) {
        scoreCircle.setAttribute('stroke', color);
        scoreCircle.style.strokeDashoffset = 283 - (283 * (score / 100)); // 283 is full circle
    }

    if(scoreLabel) {
        scoreLabel.innerText = label;
        scoreLabel.className = `mt-4 text-sm font-bold px-3 py-1 rounded-full border ${labelClass}`;
    }

    if (a11yScore !== 'N/A') {
        let a11yColor = '#ef4444';
        let a11yText = 'Needs Work';
        let a11yLabelClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';

        if (a11yScore >= 90) {
            a11yColor = '#22c55e';
            a11yText = 'Excellent';
            a11yLabelClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20';
        } else if (a11yScore >= 50) {
            a11yColor = '#eab308';
            a11yText = 'Average';
            a11yLabelClass = 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20';
        }

        if(a11yCircle) {
            a11yCircle.setAttribute('stroke', a11yColor);
            a11yCircle.style.strokeDashoffset = 283 - (283 * (a11yScore / 100));
        }
        if(a11yLabel) {
            a11yLabel.innerText = a11yText;
            a11yLabel.className = `mt-4 text-sm font-bold px-3 py-1 rounded-full border ${a11yLabelClass}`;
        }
    } else {
        if(a11yCircle) a11yCircle.style.strokeDashoffset = 283;
        if(a11yLabel) {
            a11yLabel.innerText = 'No Data';
            a11yLabel.className = 'mt-4 text-sm font-bold px-3 py-1 rounded-full border text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
        }
    }

    if (seoScore !== 'N/A') {
        let seoColor = '#ef4444';
        let seoText = 'Needs Work';
        let seoLabelClass = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';

        if (seoScore >= 90) {
            seoColor = '#22c55e';
            seoText = 'Excellent';
            seoLabelClass = 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20';
        } else if (seoScore >= 50) {
            seoColor = '#eab308';
            seoText = 'Average';
            seoLabelClass = 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-100 dark:border-yellow-500/20';
        }

        if(seoCircle) {
            seoCircle.setAttribute('stroke', seoColor);
            seoCircle.style.strokeDashoffset = 283 - (283 * (seoScore / 100));
        }
        if(seoLabel) {
            seoLabel.innerText = seoText;
            seoLabel.className = `mt-4 text-sm font-bold px-3 py-1 rounded-full border ${seoLabelClass}`;
        }
    } else {
        if(seoCircle) seoCircle.style.strokeDashoffset = 283;
        if(seoLabel) {
            seoLabel.innerText = 'No Data';
            seoLabel.className = 'mt-4 text-sm font-bold px-3 py-1 rounded-full border text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
        }
    }

    // Dynamic Asset List Injection
    const assetListContainer = document.querySelector('.analyzer-asset-item')?.parentElement;
    if (assetListContainer) {
        if (assets.length === 0) {
            assetListContainer.innerHTML = '<p class="text-sm text-slate-500 p-4">No significant external unoptimized assets found!</p>';
        } else {
            assetListContainer.innerHTML = assets.map(a => {
                const kb = (a.transferSize / 1024).toFixed(1) + ' KB';
                const ms = a.networkEndTime ? Math.round(a.networkEndTime) + 'ms' : kb;
                return `
                <div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/30 rounded-xl p-3 analyzer-asset-item transition-all duration-500">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 analyzer-asset-title">External ${a.resourceType || 'Asset'}</span>
                        <span class="text-xs text-slate-500">${ms}</span>
                    </div>
                    <p class="font-mono text-xs text-slate-600 dark:text-slate-300 break-all mb-2 analyzer-asset-url">${escapeHtml(a.url)}</p>
                </div>`;
            }).join('');
        }
    }

    // Draw Chart
    const ctx = document.getElementById('analyzerSpeedChart')?.getContext('2d');
    if (!ctx) return;
    if (siteAnalyzerChartInstance) siteAnalyzerChartInstance.destroy();

    const currentSpeed = score < 50 ? [800, 750, 820, 790, 850] : [400, 380, 420, 390, 410];
    const optimizedSpeed = [50, 45, 55, 48, 52];
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    if (typeof Chart !== 'undefined') {
        siteAnalyzerChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Asset 1', 'Asset 2', 'Asset 3', 'Asset 4', 'Asset 5'],
                datasets: [
                    { label: 'Current Latency (ms)', data: currentSpeed, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 4 },
                    { label: 'GitDelivr Latency (ms)', data: optimizedSpeed, backgroundColor: 'rgba(34, 197, 94, 0.8)', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } }
            }
        });
    }
}

window.analyzerSimulateReplaceAll = function() {
    const items = document.querySelectorAll('.analyzer-asset-item');
    const btn = document.getElementById('analyzerReplaceAllBtn');
    if (btn) {
        btn.innerText = 'Optimized!';
        btn.disabled = true;
        btn.classList.add('bg-green-500', 'text-white', 'border-green-600');
        btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-700');
    }

    items.forEach(item => {
        item.classList.remove('bg-red-50', 'dark:bg-red-500/10', 'border-red-100', 'dark:border-red-500/30');
        item.classList.add('bg-green-50', 'dark:bg-green-500/10', 'border-green-100', 'dark:border-green-500/30');
        
        const title = item.querySelector('.analyzer-asset-title');
        if (title) {
            title.classList.remove('text-red-600', 'dark:text-red-400');
            title.classList.add('text-green-600', 'dark:text-green-400');
            title.innerText = 'GitDelivr Edge Asset';
        }
        
        const url = item.querySelector('.analyzer-asset-url');
        if (url) {
            try { url.innerText = `https://cdn.gitdelivr.in/proxy?url=${encodeURIComponent(url.innerText)}`; } catch(e) {}
        }
    });

    // Boost score UI
    const scoreVal = document.getElementById('analyzerScoreValue');
    const scoreLabel = document.getElementById('analyzerScoreLabel');
    const scoreCircle = document.getElementById('analyzerScoreCircle');
    
    let targetScore = Math.min(99, (parseInt(scoreVal?.innerText) || 50) + 45);
    
    if(scoreVal) scoreVal.innerText = targetScore;
    if(scoreLabel) {
        scoreLabel.innerText = 'Excellent';
        scoreLabel.className = 'mt-4 text-sm font-bold px-3 py-1 rounded-full border text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20';
    }
    if(scoreCircle) {
        scoreCircle.setAttribute('stroke', '#22c55e');
        scoreCircle.style.strokeDashoffset = 283 - (283 * (targetScore / 100));
    }

    if (siteAnalyzerChartInstance) {
        siteAnalyzerChartInstance.data.datasets[0].data = [50, 45, 55, 48, 52];
        siteAnalyzerChartInstance.data.datasets[0].backgroundColor = 'rgba(34, 197, 94, 0.4)';
        siteAnalyzerChartInstance.update();
    }
};

// --- UI Functions ---
window.openModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
};
window.closeModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
    if (overlay) overlay.classList.toggle('hidden');
};
window.switchTab = (tabId, btnElement) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');
    
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.warn(`[GitDelivr] Tab content section for '#${tabId}' is missing on this page.`);
    }
    
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('nav-active'));
    if(btnElement) btnElement.classList.add('nav-active');
    if (window.innerWidth < 768) window.toggleSidebar();
};
window.toggleDropdown = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
};
window.openLoginIfNotLoggedIn = () => {
    if (!auth.currentUser) window.openModal('loginModal');
};
window.toggleView = (viewId) => {
    ['loginView', 'signupView', 'forgotView'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(viewId);
    if(target) target.classList.remove('hidden');
};

async function fetchGitHubRepos(user) {
    const githubConnectOption = document.getElementById('githubConnectOption');
    const repoList = document.getElementById('repoList');
    if(!repoList || !githubConnectOption) return; // UI safeguard
    
    const providers = getLinkedProviderState(user);
    let githubUsername = "";
    let githubProfile = null;

    if (providers.isGithubLinked) {
        // Find the GitHub provider data to get the username
        const githubProviderData = user.providerData.find(p => p.providerId === 'github.com');
        if (githubProviderData) {
            githubProfile = githubProviderData;
            // The screenName is often available in reloadUserInfo for GitHub
            githubUsername = user.reloadUserInfo?.screenName || githubProviderData.email.split('@')[0];
        }
    }

    if (githubUsername) {
        githubConnectOption.classList.add('hidden');
        
        let detailsDiv = document.getElementById('githubAccountDetails');
        if (!detailsDiv) {
            detailsDiv = document.createElement('div');
            detailsDiv.id = 'githubAccountDetails';
            detailsDiv.className = "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up";
            repoList.parentNode.insertBefore(detailsDiv, repoList);
        }
        detailsDiv.innerHTML = `
            <div class="flex items-center gap-3 w-full">
                <img src="${githubProfile?.photoURL}" class="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600">
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm text-slate-800 dark:text-white truncate">${githubProfile?.displayName || githubUsername}</p>
                    <div class="flex flex-col sm:flex-row sm:gap-3 text-xs text-slate-500">
                        <span class="font-mono">@${githubUsername}</span>
                        <span class="hidden sm:inline">•</span>
                        <span class="font-mono">ID: ${githubProfile?.uid}</span>
                        <span class="hidden sm:inline">•</span>
                        <span class="truncate">${githubProfile?.email}</span>
                    </div>
                </div>
                <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md whitespace-nowrap">Connected</span>
            </div>`;
        detailsDiv.classList.remove('hidden');

        repoList.innerHTML = `<p class="text-sm text-slate-500 animate-pulse col-span-2">Fetching Repositories...</p>`;
        
        try {
            const token = sessionStorage.getItem('gh_token');
            const headers = token ? { Authorization: `token ${token}` } : {};
            const repoApiUrl = `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=updated&per_page=12`;
        const res = await fetch(repoApiUrl, { headers });

            if (!res.ok) throw new Error(res.status === 403 ? "Rate limit exceeded" : `Failed to load (${res.status})`);
            const repos = await res.json();
            
            repoList.innerHTML = "";
            repos.forEach(repo => {
                const owner = escapeJsStringForOnclick(repo.owner?.login || '');
                const repoNameForClick = escapeJsStringForOnclick(repo.name || '');
                const repoName = escapeHtml(repo.name || 'Repository');
                const stars = Number(repo.stargazers_count) || 0;
                const forks = Number(repo.forks_count) || 0;
                repoList.innerHTML += `
                    <div class="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-900/50 transition shadow-sm"
                         onclick="document.getElementById('user').value='${owner}'; document.getElementById('repo').value='${repoNameForClick}'; switchTab('tabGenerator', document.querySelectorAll('.nav-btn')[0]);">
                        <h4 class="font-bold text-blue-600 dark:text-blue-400 text-sm truncate">${repoName}</h4>
                        <p class="text-xs text-slate-500 mt-1">Stars ${stars} | Forks ${forks}</p>
                    </div>
                `;
            });
        } catch (e) {
            repoList.innerHTML = `<p class="text-red-500 text-sm col-span-2">Could not load repos. ${e.message}</p>`;
        }
    } else {
        const detailsDiv = document.getElementById('githubAccountDetails');
        if(detailsDiv) detailsDiv.classList.add('hidden');
    }
}

window.loadHistory = async () => {
    const historyList = document.getElementById('historyList');
    if(!historyList) return;

    if (!auth.currentUser) {
        historyList.innerHTML = '<p class="text-slate-500 text-sm">Please login to view history.</p>';
        return;
    }
    
    historyList.innerHTML = '<p class="text-center py-6 text-slate-500 animate-pulse">Loading history...</p>';
    
    try {
        // The orderBy clause requires a custom index in Firestore. Removing it and sorting on the client is more robust.
        const q = query(collection(db, "history"), where("userId", "==", auth.currentUser.uid), limit(50));
        const snapshot = await getDocs(q);
        
        historyList.innerHTML = "";
        if (snapshot.empty) {
            historyList.innerHTML = '<p class="text-center py-6 text-slate-500">No links generated yet.</p>';
            return;
        }

        const historyItems = [];
        snapshot.forEach(doc => historyItems.push({ id: doc.id, ...doc.data() }));

        // Sort by timestamp descending on the client-side
        historyItems.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        let html = "";
        historyItems.forEach(data => {
            const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : 'Just now';
            html += `
                <div class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center group mb-3">
                    <div class="overflow-hidden mr-4">
                        <p class="text-xs font-bold text-blue-500 uppercase">${data.repo}</p>
                        <p class="text-sm font-mono truncate text-slate-700 dark:text-slate-300">${data.link}</p>
                        <p class="text-[10px] text-slate-400 mt-1">${date}</p>
                    </div>
                    <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                        <button onclick="copyToClipboard('${data.link}')" class="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center" title="Copy"><svg class="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
                        <button onclick="deleteHistoryItem('${data.id}')" class="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
            `;
        });
        historyList.innerHTML = html;
    } catch(e) {
        console.error(e);
        historyList.innerHTML = '<p class="text-center py-6 text-red-500">Error loading history.</p>';
    }
};

window.deleteHistoryItem = async (id) => {
    if (!confirm("Are you sure you want to delete this link?")) return;
    try {
        await deleteDoc(doc(db, "history", id));
        loadHistory();
    } catch (e) {
        console.error("Error deleting history item:", e);
        alert("Failed to delete item.");
    }
};

// --- Expose Generic History Saver for Streamers ---
window.saveToHistory = async (repo, file, link, provider) => {
    if (auth.currentUser) {
        try {
            await addDoc(collection(db, "history"), {
                userId: auth.currentUser.uid,
                repo: repo || "External Source",
                file: file || "media-file",
                link: link,
                provider: provider || "gitdelivr",
                timestamp: serverTimestamp()
            });
        } catch (e) { console.error("Error saving to history:", e); }
    }
};


// =======================================================
// --- FIREBASE LOGIC ---
// =======================================================

const firebaseConfig = {
    apiKey: "AIzaSyC_U_pYSYWNm6Q1ufFwQE_tYlQZIYeDU0g",
    authDomain: "gitdelivr.in",
    projectId: "cdn-generator",
    storageBucket: "cdn-generator.firebasestorage.app",
    messagingSenderId: "44677120607",
    appId: "1:44677120607:web:b4719f7b7c6414cd19d1ea",
    measurementId: "G-9RK16SGB09"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

async function initAuth() {
    try {
        initAnalytics();
        trackUserActivity();
        setupRealtimeReviews();
        listenForMaintenanceMode();
        listenForAnnouncement();
        initAds();
        setupAuthListeners();
        setupNotificationSystem();
        initNotificationsPage();
        initMessaging(); // Initialize FCM
        fetchHomeStats();
    } catch (e) {
        console.error("Auth init failed", e);
    }
}

// --- Home Page Statistics Logic ---
async function fetchHomeStats() {
    const usersEl = document.getElementById('homeTotalUsers');
    const trafficEl = document.getElementById('homeTotalTraffic');
    const ratingEl = document.getElementById('homeAvgRating');
    
    if (!usersEl && !trafficEl && !ratingEl) return;

    try {
        // 1. Fetch Total Users using Aggregation Query (Fast & Cheap)
        if (usersEl) {
            const usersSnap = await getCountFromServer(collection(db, 'users'));
            const userCount = usersSnap.data().count;
            usersEl.innerText = userCount.toLocaleString() + "+";
            usersEl.classList.remove('animate-pulse');
        }

        // 2. Fetch Total Traffic (sum of 'views' across all daily docs in site_stats)
        if (trafficEl) {
            const statsSnap = await getDocs(collection(db, 'site_stats'));
            let traffic = 0;
            statsSnap.forEach(doc => { traffic += (doc.data().views || 0); });
            
            // Format traffic nicely (e.g., 1.2k+, 15k+)
            if (traffic >= 1000) {
                trafficEl.innerText = (traffic / 1000).toFixed(1) + "k+";
            } else {
                trafficEl.innerText = traffic.toLocaleString() + "+";
            }
            trafficEl.classList.remove('animate-pulse');
        }

        // 3. Fetch Average Rating from Reviews
        if (ratingEl) {
            const reviewsSnap = await getDocs(collection(db, 'reviews'));
            let totalRating = 0, count = 0;
            reviewsSnap.forEach(doc => { totalRating += (doc.data().rating || 0); count++; });
            
            const avg = count > 0 ? (totalRating / count).toFixed(1) : "5.0";
            ratingEl.innerText = avg + " / 5";
            ratingEl.classList.remove('animate-pulse');
        }
    } catch (e) {
        console.error("Error fetching home stats:", e);
        // Graceful fallback UI in case of permission/network errors
        if (usersEl) { usersEl.innerText = "500+"; usersEl.classList.remove('animate-pulse'); }
        if (trafficEl) { trafficEl.innerText = "10k+"; trafficEl.classList.remove('animate-pulse'); }
        if (ratingEl) { ratingEl.innerText = "4.9 / 5"; ratingEl.classList.remove('animate-pulse'); }
    }
}

// --- User Activity Tracking (Tolet Service-4 you) ---
async function trackUserActivity() {
    // Prevent duplicate tracking in the same session
    if (sessionStorage.getItem('activityTracked')) return;

    try {
        // 1. Capture Device & Browser Details
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Trident")) browser = "Internet Explorer";
        else if (ua.includes("Edge")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        let os = "Unknown";
        if (ua.includes("Win")) os = "Windows";
        else if (ua.includes("Mac")) os = "MacOS";
        else if (ua.includes("Linux")) os = "Linux";
        else if (ua.includes("Android")) os = "Android";
        else if (ua.includes("like Mac")) os = "iOS";

        const deviceType = /Mobi|Android/i.test(ua) ? "Mobile" : "Desktop";
        const resolution = `${window.screen.width}x${window.screen.height}`;

        // 2. Fetch Location (Robust Fallback)
        let ipData = { ip: 'Unknown', city: 'Unknown', country: 'Unknown' };
        
        try {
            // Try ipapi.co first
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                if (data.error) throw new Error(data.reason);
                ipData = { ip: data.ip, city: data.city, country: data.country_name };
            } else {
                throw new Error("ipapi.co failed");
            }
        } catch (e) {
            try {
                // Fallback to ipwho.is
                const res2 = await fetch('https://ipwho.is/');
                if (res2.ok) {
                    const data = await res2.json();
                    if (data.success) {
                        ipData = { ip: data.ip, city: data.city, country: data.country };
                    }
                }
            } catch (e2) { console.warn("Location tracking failed:", e2); }
        }

        // 3. Save to Firebase 'user_activity' collection
        await addDoc(collection(db, 'user_activity'), {
            ip: ipData.ip || 'Unknown',
            city: ipData.city || 'Unknown',
            country: ipData.country || 'Unknown',
            deviceType,
            browser,
            os,
            resolution,
            userAgent: ua,
            timestamp: serverTimestamp()
        });

        sessionStorage.setItem('activityTracked', 'true');
    } catch (error) {
        console.error("Tracking Error:", error);
    }
}

// --- Firebase Messaging (Push Notifications) ---
async function initMessaging() {
    try {
        const messaging = getMessaging(app);
        
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "granted") {
            await enableMessaging(messaging);
        } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                await enableMessaging(messaging);
            } else {
                console.warn("FCM: Notification permission denied.");
            }
        } else {
            console.warn("FCM: Notification permission previously denied.");
        }
    } catch (e) {
        console.error("FCM Init Error:", e);
    }
}

async function enableMessaging(messaging) {
    try {
        const VAPID_KEY = "BNiehtSF6nqLWEgfIyj9rdJbz7Usx04SmnQFcPgImjbjBOrKGoIoAzzjqaz8eZrX-dOeKU-ilusC4bNLjJaqYXQ"; 

        if (VAPID_KEY === "YOUR_VAPID_KEY_HERE") {
            console.error("❌ FCM Error: Missing VAPID Key. Please replace 'YOUR_VAPID_KEY_HERE' in script.js.");
            return;
        }

        let serviceWorkerRegistration = null;
        if ('serviceWorker' in navigator) {
            try {
                serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            } catch (err) {
                console.error('Service Worker registration failed:', err);
            }
        }

        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration });
        if (token) {
            console.log("FCM Token:", token);
            if (auth.currentUser) {
                await setDoc(doc(db, "users", auth.currentUser.uid), { fcmToken: token }, { merge: true });
            }
        }

        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            showForegroundNotification(payload);
        });
    } catch (error) {
        console.error("FCM Token Error:", error);
    }
}

function showForegroundNotification(payload) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-5 right-5 bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-4 border border-slate-200 dark:border-slate-700 z-[9999] max-w-sm transition-all duration-300 transform translate-x-full opacity-0';
    
    const title = payload.notification.title || 'New Message';
    const body = payload.notification.body || 'You have a new message.';
    const icon = payload.notification.icon || 'https://gitdelivr.in/favicon.ico';

    notification.innerHTML = `
        <div class="flex items-start gap-4">
            <img src="${icon}" class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-600">
            <div class="flex-1">
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">${title}</h4>
                <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">${body}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => { notification.classList.remove('translate-x-full', 'opacity-0'); notification.classList.add('translate-x-0'); }, 100);
    setTimeout(() => { notification.classList.add('opacity-0'); setTimeout(() => notification.remove(), 300); }, 5000);
}

// --- AUTHENTICATION & UI LOGIC ---
function setupAuthListeners() {
    // 1. Monitor Auth State
    onAuthStateChanged(auth, (user) => {
        const loginBtn = document.getElementById('topLoginBtn');
        const profileSec = document.getElementById('topProfileSection');
        const logoutBtn = document.getElementById('btnLogout'); // Sidebar logout
        const notifArea = document.getElementById('userNotificationArea');
        const btnTopLinkGithub = document.getElementById('btnTopLinkGithub');
        
        if (user) {
            if(loginBtn) loginBtn.classList.add('hidden');
            if(profileSec) profileSec.classList.remove('hidden');
            if(logoutBtn) logoutBtn.classList.remove('hidden');
            if(notifArea) notifArea.classList.remove('hidden');

            // Smart Name
            let name = user.displayName;
            if (!name && user.email) {
                name = user.email.split('@')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
            }
            const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${name}&background=random`;

            // Update UI Elements
            if(document.getElementById('topAvatar')) document.getElementById('topAvatar').src = avatar;
            if(document.getElementById('dropName')) document.getElementById('dropName').innerText = name || "User";
            if(document.getElementById('dropEmail')) document.getElementById('dropEmail').innerText = user.email;
            
            // Sidebar (if exists)
            if(document.getElementById('sideName')) document.getElementById('sideName').innerText = name || "User";
            if(document.getElementById('sideEmail')) document.getElementById('sideEmail').innerText = user.email;
            if(document.getElementById('sideAvatar')) document.getElementById('sideAvatar').src = avatar;
            
            fetchGitHubRepos(user);

            // **NEW LOGIC**: Check provider data and update UI
            const providers = getLinkedProviderState(user);
            const githubConnectOption = document.getElementById('githubConnectOption');
            const primaryLoginBadge = document.getElementById('primaryProviderBadge');

            if (document.body) {
                document.body.dataset.googleLinked = String(providers.isGoogleLinked);
                document.body.dataset.githubLinked = String(providers.isGithubLinked);
                document.body.dataset.primaryProvider = providers.primaryProviderId || '';
            }

            if (primaryLoginBadge) {
                primaryLoginBadge.textContent = `Primary: ${describeProvider(providers.primaryProviderId)}`;
            }

            if (githubConnectOption) {
                const connectBtn = githubConnectOption.querySelector('button');
                if (providers.isGithubLinked) {
                    githubConnectOption.classList.add('hidden');
                    if (connectBtn) connectBtn.onclick = null;
                    if (btnTopLinkGithub) btnTopLinkGithub.classList.add('hidden');
                } else {
                    githubConnectOption.classList.remove('hidden');
                    if (connectBtn) {
                        connectBtn.textContent = 'Connect GitHub Account';
                        connectBtn.onclick = connectGithubAccount;
                    }
                    if (btnTopLinkGithub) {
                        btnTopLinkGithub.classList.remove('hidden');
                        btnTopLinkGithub.onclick = connectGithubAccount;
                    }
                }
            }
        } else {
            pendingCredentialForLinking = null;
            if(loginBtn) loginBtn.classList.remove('hidden');
            if(profileSec) profileSec.classList.add('hidden');
            if(logoutBtn) logoutBtn.classList.add('hidden');
            if(notifArea) notifArea.classList.add('hidden');
            if (document.body) {
                delete document.body.dataset.googleLinked;
                delete document.body.dataset.githubLinked;
                delete document.body.dataset.primaryProvider;
            }
            
            // Ensure admin maintenance bypass is cleared on logout
            localStorage.removeItem('adminAuth');

            // Sidebar Reset
            if(document.getElementById('sideName')) document.getElementById('sideName').innerText = "Guest";
            if(document.getElementById('sideEmail')) document.getElementById('sideEmail').innerText = "Click to Login";
            
            const detailsDiv = document.getElementById('githubAccountDetails');
            if(detailsDiv) detailsDiv.classList.add('hidden');

            const repoList = document.getElementById('repoList');
            if (repoList) {
                const githubConnectOption = document.getElementById('githubConnectOption');
                if (githubConnectOption) {
                    // Reset to default login prompt when logged out
                    githubConnectOption.classList.remove('hidden');
                    const loginBtn = githubConnectOption.querySelector('button');
                    if (loginBtn) {
                        loginBtn.textContent = 'Login with GitHub';
                        loginBtn.onclick = signInWithGitHubAndLink;
                    }
                    repoList.innerHTML = `<p class="text-slate-500 text-sm">Login with GitHub to see your repos here.</p>`;
                }
            }
        }
    });

    // 2. Bind Login Buttons (Check existence first)
    const btnGoogle = document.getElementById('btnGoogleLogin');
    if(btnGoogle) btnGoogle.onclick = async () => {
        const overlay = document.getElementById('loginLoadingOverlay');
        if (overlay) overlay.style.display = ''; // Reset any inline styles from previous runs
        
        showLoginLoading("Connecting to Google...");
        try {
            const res = await signInWithPopup(auth, googleProvider);
            await handleUserLogin(res.user, 'google.com');
            hideLoginLoading();
            if (overlay) overlay.style.display = 'none'; // Force hide on success
            
            if(typeof closeModal === 'function') closeModal('loginModal');
            const userName = res.user.displayName || res.user.email?.split('@')[0] || 'Developer';
            showWelcomeNotification(userName);
        } catch(e) { 
            hideLoginLoading();
            if (overlay) overlay.style.display = 'none'; // Force hide on failure/cancel
            
            if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                alert(e.message); 
            }
        }
    };

    const btnGithub = document.getElementById('btnGithubLogin');
    if(btnGithub) {
        // Use the account linking flow for the main GitHub login button
        btnGithub.onclick = signInWithGitHubAndLink;
    }

    // This is for the button on the Repos tab
    const githubConnectBtn = document.getElementById('githubConnectOption')?.querySelector('button');
    if (githubConnectBtn) {
        // Also use the account linking flow here
        githubConnectBtn.onclick = signInWithGitHubAndLink;
    }

    const btnEmailLogin = document.getElementById('btnEmailLogin');
    if(btnEmailLogin) btnEmailLogin.onclick = async () => {
        const email = document.getElementById('authEmail').value;
        const pass = document.getElementById('authPass').value;
        const unverifiedAlert = document.getElementById('unverifiedAlert');
        if (unverifiedAlert) unverifiedAlert.classList.add('hidden');

        showLoginLoading("Logging in...");
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);

                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    hideLoginLoading();
                    if (unverifiedAlert) {
                        unverifiedAlert.classList.remove('hidden');
                    } else {
                        alert("Please verify your email address before logging in.");
                    }
                    return;
                }

            if (pendingCredentialForLinking) {
                showLoginLoading("Linking GitHub account...");
                await linkPendingGithubCredential(userCredential.user);
                alert("GitHub account successfully linked!");
            }

            await handleUserLogin(userCredential.user, 'password');

            hideLoginLoading();
            if(typeof closeModal === 'function') closeModal('loginModal');
            const userName = userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Developer';
            showWelcomeNotification(userName);
        } catch(e) { 
            hideLoginLoading();
            // Clear pending credential on login failure
            pendingCredentialForLinking = null;
            alert("Login failed: " + e.message); 
        }
    };

    const btnSignup = document.getElementById('btnEmailSignup');
    if(btnSignup) btnSignup.onclick = async () => {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const pass = document.getElementById('signupPass').value;
        if(!name || !email || !pass) return alert("Fill all fields");
        showLoginLoading("Creating account...");
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(res.user, { displayName: name });
            await handleUserLogin(res.user, 'password');
            
            await sendEmailVerification(res.user);
            await signOut(auth);
            
            hideLoginLoading();
            alert("Account created successfully! Please check your email to verify your account before logging in.");
            window.toggleView('loginView');
        } catch(e) { 
            hideLoginLoading();
            alert(e.message); 
        }
    };

    // Resend Verification Email logic
    const btnResendVerification = document.getElementById('btnResendVerification');
    if (btnResendVerification) {
        btnResendVerification.onclick = async () => {
            const email = document.getElementById('authEmail').value;
            const pass = document.getElementById('authPass').value;
            if (!email || !pass) return alert("Please enter your email and password to resend the link.");
            
            showLoginLoading("Sending verification link...");
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                await sendEmailVerification(userCredential.user);
                await signOut(auth);
                hideLoginLoading();
                document.getElementById('unverifiedAlert')?.classList.add('hidden');
                alert("Verification email sent! Please check your inbox and spam folder.");
            } catch (e) {
                hideLoginLoading();
                alert("Failed to send verification email: " + e.message);
            }
        };
    }

    // Forgot Password (User Side)
    const btnResetPass = document.getElementById('btnResetPass');
    if(btnResetPass) {
        btnResetPass.addEventListener('click', async () => {
            const emailInput = document.getElementById('resetEmail');
            const email = emailInput.value.trim();
            const spinner = document.getElementById('forgotSpinner');
            const btnText = document.getElementById('forgotBtnText');
            const statusMessage = document.getElementById('forgotStatusMessage');
            
            if (!email) return alert("Please enter your email first!");

            const showStatus = (msg, isError) => {
                statusMessage.textContent = msg;
                statusMessage.className = `rounded-lg p-3 text-sm font-medium border mb-4 text-left transition-all duration-300 ${
                    isError 
                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                }`;
                statusMessage.classList.remove('hidden');
            };

            statusMessage.classList.add('hidden');
            btnResetPass.disabled = true;
            emailInput.disabled = true;
            spinner.classList.remove('hidden');
            btnText.textContent = 'Verifying...';

            let isSuccess = false;

            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", email));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    showStatus('This email is not registered with us. Please check for typos or sign up.', true);
                } else {
                    btnText.textContent = 'Sending...';
                    await sendPasswordResetEmail(auth, email);
                    showStatus('Reset link sent! Please check your inbox (and spam folder).', false);
                    isSuccess = true;
                    btnText.textContent = 'Link Sent';
                }
            } catch (error) {
                console.error("Forgot password error:", error);
                showStatus('An error occurred. Please try again later.', true);
            } finally {
                spinner.classList.add('hidden');
                if (!isSuccess) {
                    btnResetPass.disabled = false;
                    emailInput.disabled = false;
                    btnText.textContent = 'Send Reset Link';
                }
            }
        });
    }
}

// Expose Logout
window.logout = () => {
    sessionStorage.removeItem('gh_token');
    signOut(auth).then(() => location.reload());
};

function listenForMaintenanceMode() {
    const overlay = document.getElementById('maintenanceOverlay');
    if (!overlay) return;

    const settingsRef = doc(db, 'settings', 'config');
    const msgEl = document.getElementById('maintenanceMessage');
    let maintenanceTimeout;

    onSnapshot(settingsRef, (docSnap) => {
        const data = docSnap.exists() ? docSnap.data() : {};
        let isMaintenance = data.maintenanceMode === true;
        const isAdmin = localStorage.getItem('adminAuth') === 'true';
        
        // Clear existing timeout
        if (maintenanceTimeout) clearTimeout(maintenanceTimeout);

        // Check Schedule
        if (!isMaintenance && data.scheduledStart && typeof data.scheduledStart.toDate === 'function') {
            const start = data.scheduledStart.toDate();
            const now = new Date();
            if (now >= start) {
                isMaintenance = true;
            } else {
                const delay = start - now;
                if (delay > 0 && delay < 2147483647) {
                    maintenanceTimeout = setTimeout(() => {
                        if (!localStorage.getItem('adminAuth')) {
                            overlay.classList.remove('hidden');
                            overlay.classList.add('flex');
                        }
                    }, delay);
                }
            }
        }

        if (isMaintenance && !isAdmin) {
            if(msgEl) msgEl.innerText = data.message || "The tool is currently unavailable. Please check back later.";
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');

            // Show Admin Badge if maintenance is active but bypassed
            if (isMaintenance && isAdmin) {
                let badge = document.getElementById('adminMaintenanceBadge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'adminMaintenanceBadge';
                    badge.className = 'fixed bottom-20 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold z-[2000] shadow-lg pointer-events-none';
                    badge.innerText = 'Maintenance Mode Active (Admin Bypass)';
                    document.body.appendChild(badge);
                }
            } else {
                const badge = document.getElementById('adminMaintenanceBadge');
                if (badge) badge.remove();
            }
        }
    }, (error) => {
        console.error("Could not listen for maintenance mode:", error);
    });
}

// --- Announcement Logic ---
function listenForAnnouncement() {
    const announcementRef = doc(db, 'settings', 'announcement');
    const banner = document.getElementById('announcementBanner');
    const text = document.getElementById('announcementText');
    const title = document.getElementById('announcementTitle');
    const iconContainer = document.getElementById('announcementIcon');
    const closeBtn = document.getElementById('closeAnnouncement');

    if(closeBtn) {
        closeBtn.addEventListener('click', () => {
            banner.classList.add('-translate-y-full');
            sessionStorage.setItem('announcementClosed', 'true');
            // Only close THIS specific message
            const currentMsg = document.getElementById('announcementText').innerText;
            sessionStorage.setItem('closedAnnouncement', currentMsg);
        });
    }

    onSnapshot(announcementRef, (snap) => {
        if(snap.exists()) {
            const data = snap.data();
            const wasClosed = sessionStorage.getItem('closedAnnouncement') === data.message;

            if(data.active && data.message && !wasClosed) {
                if (text) text.innerText = data.message;
                
                // Reset colors and apply new type
                const baseClasses = "relative z-[2000] hidden transform -translate-y-full transition-all duration-500 ease-out shadow-md";
                let typeClass = "bg-blue-600 text-white";
                let iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                let titleText = "INFO";

                if (data.type === 'warning') {
                    typeClass = "bg-amber-500 text-white";
                    iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
                    titleText = "WARNING";
                } else if (data.type === 'error') {
                    typeClass = "bg-rose-600 text-white";
                    iconSvg = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                    titleText = "CRITICAL";
                }

                if (banner) {
                    banner.className = `${baseClasses} ${typeClass}`;
                    if(iconContainer) iconContainer.innerHTML = iconSvg;
                    if(title) title.innerText = titleText;

                    banner.classList.remove('hidden');
                    setTimeout(() => banner.classList.remove('-translate-y-full'), 100);
                }
            } else if (banner) { 
                banner.classList.add('-translate-y-full'); 
                setTimeout(() => banner.classList.add('hidden'), 500); // fully hide after animation
            }
        }
    }, (error) => {
        console.warn("Announcement sync failed:", error);
    });
}
// --- Ads Logic ---
function initAds() {
    // Check if the site is running on a local server
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (!isLocalhost) {
        // ✅ THE FIX: Wrap AdSense push in try-catch to prevent fatal site crashes
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (adError) {
            console.warn("AdSense harmless error (ignored so site keeps running):", adError.message);
        }
        
        const adsRef = doc(db, 'settings', 'ads');
        onSnapshot(adsRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                
                // Sidebar Ad
                const sidebar = document.getElementById('adSidebarContainer');
                if (sidebar) {
                    if (data.sidebar_enabled && data.sidebar) {
                        sidebar.classList.remove('hidden');
                        sidebar.style.backgroundColor = data.bgColor || 'transparent';
                        sidebar.innerHTML = data.sidebar;
                        executeScripts(sidebar);
                    } else {
                        sidebar.classList.add('hidden');
                        sidebar.style.backgroundColor = 'transparent';
                        sidebar.innerHTML = '';
                    }
                }

                // Banner Ad
                const banner = document.getElementById('adBannerContainer');
                if (banner) {
                    if (data.banner_enabled && data.banner) {
                        banner.classList.remove('hidden');
                        banner.style.backgroundColor = data.bgColor || 'transparent';
                        banner.innerHTML = data.banner;
                        executeScripts(banner);
                    } else {
                        banner.classList.add('hidden');
                        banner.style.backgroundColor = 'transparent';
                        banner.innerHTML = '';
                    }
                }
            }
        }, (error) => {
            console.warn("Ads sync failed:", error);
        });
    } else {
        console.info('AdSense is disabled on localhost to prevent 403 errors.');
    }
}
function executeScripts(element) {
    Array.from(element.querySelectorAll("script")).forEach(oldScript => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

// --- Notification System (User Side) ---
function setupNotificationSystem() {
    const btn = document.getElementById('notificationBtn');
    const dropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');
    const list = document.getElementById('notificationList');
    const searchInput = document.getElementById('searchNotifications');

    if(btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    onAuthStateChanged(auth, (user) => {
        if (user && list) {
            let allNotifications = [];
            // Removed orderBy to prevent missing index error. Sorting is done client-side.
            const q = query(collection(db, 'notifications'), where('userId', '==', user.uid), limit(50));
            let isFirstLoad = true;
            
            onSnapshot(q, (snapshot) => {
                // Show toast for new notifications (skip on first load)
                if (!isFirstLoad) {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === "added") {
                            const data = change.doc.data();
                            if (!data.read) {
                                showForegroundNotification({ notification: { title: 'New Notification', body: data.message } });
                            }
                        }
                    });
                }
                isFirstLoad = false;

                const notifs = [];
                let unreadCount = 0;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    notifs.push({ id: doc.id, ...data });
                    if (!data.read) unreadCount++;
                });
                
                // Client-side sort
                notifs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

                allNotifications = notifs;

                // Update Badge
                if (unreadCount > 0) {
                    badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }

                renderNotifications(allNotifications);
            });

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const filtered = allNotifications.filter(n => n.message.toLowerCase().includes(term));
                    renderNotifications(filtered);
                });
            }
        }
    });

    function renderNotifications(notifs) {
        if (!notifs.length) { list.innerHTML = '<p class="text-center text-slate-500 text-xs py-8">No notifications found.</p>'; return; }
        let html = "";
        notifs.forEach(n => {
            const time = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
            const bgClass = n.read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-900/20';
            const id = escapeJsStringForOnclick(n.id);
            const message = escapeHtml(n.message || '');
            html += `
                <div class="p-3 ${bgClass} hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer border-b border-slate-100 dark:border-slate-700/50 relative group" onclick="window.markRead('${id}')">
                    <div class="pr-6">
                        <p class="text-sm text-slate-800 dark:text-slate-200">${message}</p>
                        <p class="text-[10px] text-slate-400 mt-1 text-right">${time}</p>
                    </div>
                    <button onclick="window.deleteNotification('${id}', event)" class="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Delete">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
        });
        list.innerHTML = html;
    }

    window.markRead = async (id) => { await updateDoc(doc(db, 'notifications', id), { read: true }); };
    window.deleteNotification = async (id, event) => {
        if(event) event.stopPropagation();
        if(confirm("Delete this notification?")) {
            try { await deleteDoc(doc(db, 'notifications', id)); } catch(e) { console.error(e); }
        }
    };
    window.markAllRead = async () => {
        if(!auth.currentUser) return;
        const batch = writeBatch(db);
        const q = query(collection(db, 'notifications'), where('userId', '==', auth.currentUser.uid), where('read', '==', false));
        const snaps = await getDocs(q);
        snaps.forEach(doc => batch.update(doc.ref, { read: true }));
        await batch.commit();
    };
}

// --- All Notifications Page Logic ---
function initNotificationsPage() {
    const listContainer = document.getElementById('allNotificationsList');
    if (!listContainer) return; // Only run on notifications.html

    // Bulk Actions State
    let selectedNotifIds = new Set();
    let currentNotifIds = [];
    
    const selectAllCheckbox = document.getElementById('selectAllNotifs');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const bulkSelectContainer = document.getElementById('bulkSelectContainer');

    // UI Updater
    const updateBulkUI = () => {
        if (selectedNotifIds.size > 0) {
            if(deleteSelectedBtn) {
                deleteSelectedBtn.classList.remove('hidden');
                deleteSelectedBtn.innerText = `Delete Selected (${selectedNotifIds.size})`;
            }
        } else {
            if(deleteSelectedBtn) deleteSelectedBtn.classList.add('hidden');
        }
        
        if(selectAllCheckbox) {
            if (currentNotifIds.length > 0 && currentNotifIds.every(id => selectedNotifIds.has(id))) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else if (selectedNotifIds.size > 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true;
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
        }
    };

    // Toggle Handler
    window.toggleNotifSelection = (id) => {
        if (selectedNotifIds.has(id)) selectedNotifIds.delete(id);
        else selectedNotifIds.add(id);
        updateBulkUI();
    };

    // Select All Listener
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const checked = e.target.checked;
            if (checked) currentNotifIds.forEach(id => selectedNotifIds.add(id));
            else selectedNotifIds.clear();
            document.querySelectorAll('.notif-checkbox').forEach(cb => cb.checked = checked);
            updateBulkUI();
        });
    }

    // Delete Selected Listener
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', async () => {
            if (selectedNotifIds.size === 0) return;
            if (confirm(`Delete ${selectedNotifIds.size} notifications?`)) {
                const batch = writeBatch(db);
                selectedNotifIds.forEach(id => {
                    batch.delete(doc(db, 'notifications', id));
                });
                try {
                    await batch.commit();
                    selectedNotifIds.clear();
                    updateBulkUI();
                } catch (e) {
                    console.error("Error deleting:", e);
                    alert("Failed to delete notifications.");
                }
            }
        });
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Removed orderBy to prevent missing index error. Sorting is done client-side.
            const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
            onSnapshot(q, (snapshot) => {
                if (snapshot.empty) {
                    listContainer.innerHTML = '<p class="text-center text-slate-500 text-xs py-8">You have no notifications.</p>';
                    if(bulkSelectContainer) bulkSelectContainer.classList.add('hidden');
                    return;
                }
                if(bulkSelectContainer) bulkSelectContainer.classList.remove('hidden');

                const notifList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Client-side sort
                notifList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                
                currentNotifIds = notifList.map(n => n.id);
                
                // Filter out stale IDs
                const availableIds = new Set(currentNotifIds);
                for (let id of selectedNotifIds) { if (!availableIds.has(id)) selectedNotifIds.delete(id); }

                const notifHtml = notifList.map(n => {
                    const time = n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString() : 'Just now';
                    const bgClass = n.read ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-blue-900/20';
                    const borderClass = n.read ? 'border-slate-200 dark:border-slate-700' : 'border-blue-200 dark:border-blue-800';
                    const isChecked = selectedNotifIds.has(n.id) ? 'checked' : '';
                    const id = escapeJsStringForOnclick(n.id);
                    const message = escapeHtml(n.message || '');
                    
                    return `
                        <div class="p-4 rounded-lg ${bgClass} border ${borderClass} flex items-center transition cursor-pointer relative group gap-3" onclick="window.markRead('${id}')">
                            <input type="checkbox" class="notif-checkbox w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 shrink-0 cursor-pointer" 
                                value="${escapeHtmlAttribute(n.id)}" 
                                ${isChecked}
                                onchange="window.toggleNotifSelection('${id}')"
                                onclick="event.stopPropagation()">
                            
                            <div class="flex-1 pr-4">
                                <p class="text-sm text-slate-800 dark:text-slate-200">${message}</p>
                                <p class="text-xs text-slate-400 mt-1">${time}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                ${!n.read ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>' : ''}
                                <button onclick="window.deleteNotification('${id}', event)" class="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');

                listContainer.innerHTML = notifHtml;
                updateBulkUI();

            }, (error) => {
                console.error("Error fetching notifications on page:", error);
                listContainer.innerHTML = '<p class="text-center text-red-500 text-xs py-8">Error loading notifications. Please try again.</p>';
            });

            const markAllBtn = document.getElementById('markAllReadBtn');
            if(markAllBtn) {
                markAllBtn.onclick = window.markAllRead; // Reuse existing function
            }

        } else {
            listContainer.innerHTML = `<div class="text-center py-10"><p class="text-slate-500">Please log in to view your notification history.</p><button onclick="openModal('loginModal')" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md transition">Login</button></div>`;
        }
    });
}

// --- Newsletter Submission ---
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        const btn = newsletterForm.querySelector('button');
        const email = emailInput.value;

        if (!email) return;

        try {
            if (!auth.currentUser) await signInAnonymously(auth);

            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "...";

            await addDoc(collection(db, 'subscribers'), { email, timestamp: serverTimestamp() });

            btn.innerText = "✓";
            emailInput.value = '';
            setTimeout(() => { btn.disabled = false; btn.innerText = originalText; }, 3000);

        } catch (error) {
            console.error("Error subscribing:", error);
            alert("Subscription failed. Error: " + (error.message || "Unknown error."));
            btn.disabled = false;
            btn.innerText = "Subscribe";
        }
    });
}

// --- Analytics Logic ---
const initAnalytics = async () => {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = doc(db, 'site_stats', today);
    
    try { await setDoc(statsRef, { views: increment(1) }, { merge: true }); } catch (e) {}

    let startTime = Date.now();
    const sendTime = async () => {
        const duration = (Date.now() - startTime) / 1000;
        if (duration < 1) return;
        startTime = Date.now();
        try { await setDoc(statsRef, { totalDuration: increment(duration) }, { merge: true }); } catch (e) {}
    };

    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sendTime(); });
    window.addEventListener('beforeunload', sendTime);
};

// --- Realtime Reviews Logic ---
function setupRealtimeReviews() {
    const grid = document.getElementById('testimonialsGrid');
    if (!grid) return;

    onSnapshot(collection(db, 'reviews'), (snapshot) => {
        const reviews = [];
        snapshot.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        reviews.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        document.querySelectorAll('.dynamic-review').forEach(el => el.remove());
        
        [...reviews].reverse().forEach(review => {
            const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
            const html = `
                <div class="dynamic-review bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-900 animate-fade-in-up">
                    <div class="flex text-yellow-400 mb-4">${"★".repeat(review.rating)}</div>
                    <p class="text-slate-600 dark:text-slate-300 italic mb-4">"${escapeHtml(review.text || '')}"</p>
                    <div class="font-bold text-slate-900 dark:text-white">- ${escapeHtml(review.name || 'Anonymous')}</div>
                </div>`;
            grid.insertAdjacentHTML('afterbegin', html);
        });
    }, (error) => {
        console.warn("Reviews sync failed:", error);
    });
}

// --- Review Submission ---
const submitReviewBtn = document.getElementById('submitReview');
if (submitReviewBtn) {
    submitReviewBtn.addEventListener('click', async () => {
        const stars = document.querySelectorAll('.star-rating button');
        const activeStars = Array.from(stars).filter(s => s.classList.contains('active'));
        const rating = activeStars.length; 

        if(!rating) return alert("Select a rating!");
        const text = document.getElementById('reviewText').value;
        const name = document.getElementById('reviewName').value || "Anonymous";
        if (!text) return alert("Please write a review!");

        try {
            submitReviewBtn.innerText = "Posting...";
            submitReviewBtn.disabled = true;
            await addDoc(collection(db, 'reviews'), { name, rating, text, timestamp: serverTimestamp() });

            document.getElementById('modalForm').classList.add('hidden');
            document.getElementById('modalSuccess').classList.remove('hidden');
            
            setTimeout(() => { 
                document.getElementById('reviewModal').classList.remove('active'); 
                document.getElementById('modalForm').classList.remove('hidden'); 
                document.getElementById('modalSuccess').classList.add('hidden'); 
                document.getElementById('reviewText').value = '';
                submitReviewBtn.innerText = "Submit Review";
                submitReviewBtn.disabled = false;
                stars.forEach(btn => { btn.classList.remove('active'); btn.style.removeProperty('color'); });
            }, 2000);
        } catch(e) {
            alert("Error saving review.");
            submitReviewBtn.disabled = false;
        }
    });
}
// =======================================================
// --- BLOGGER FEED INTEGRATION ---
// =======================================================

function showBlogs(json) {
    const container = document.getElementById("blog-container");
    if (!container) return;

    const posts = json.feed.entry;
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center text-slate-500">No blog posts found.</p>';
        return;
    }

    let html = "";
    
    // Loop through posts (max 3)
    for (let i = 0; i < Math.min(3, posts.length); i++) {
        const post = posts[i];
        const title = post.title?.$t || "Untitled";
        const safeTitle = escapeHtml(title);
        // Find the actual link to the post
        const linkObj = post.link.find(l => l.rel === "alternate");
        const link = safeExternalUrl(linkObj ? linkObj.href : "#");
        const safeLink = escapeHtmlAttribute(link);
        
        // Extract Image (Use high-res if available)
        let image = "";
        if (post.media$thumbnail) {
             const imgUrl = safeExternalUrl(post.media$thumbnail.url.replace(/s72-c/, "s600")); // Get higher resolution
             image = `<img src="${escapeHtmlAttribute(imgUrl)}" alt="${safeTitle}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy">`;
        } else {
             // Fallback placeholder
             image = `<div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-slate-700 text-slate-400">
                        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
                      </div>`;
        }

        html += `
        <article class="opacity-0 translate-y-8 transition-all duration-700 ease-out scroll-reveal delay-[${(i+1)*100}ms] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300 ease-out group hover:-translate-y-1 flex flex-col h-full overflow-hidden">
          <div class="h-48 overflow-hidden bg-gray-100 dark:bg-slate-700 relative">
             ${image}
          </div>
          <div class="p-6 flex-1 flex flex-col">
            <h3 class="text-lg font-bold mb-3 text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeTitle}</a>
            </h3>
            <div class="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center transition-colors">
                    Read Article 
                    <svg class="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                </a>
            </div>
          </div>
        </article>`;
    }

    container.innerHTML = html;
    
    // Trigger animations for new elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { 
            if (entry.isIntersecting) { 
                entry.target.classList.remove('opacity-0', 'translate-y-8');
                entry.target.classList.add('opacity-100', 'translate-y-0');
                observer.unobserve(entry.target); 
            }
        });
    }, { threshold: 0.1 });
    
    container.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// CRITICAL: Expose the function to the global window object
// This allows the Blogger JSONP callback to find it!
window.showBlogs = showBlogs;// --- Contact Form ---
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitContact');
        const status = document.getElementById('contactStatus');
        const data = {
            name: document.getElementById('contactName').value,
            email: document.getElementById('contactEmail').value,
            message: document.getElementById('contactMessage').value,
            userId: auth.currentUser ? auth.currentUser.uid : null,
            timestamp: serverTimestamp()
        };

        try {
            btn.disabled = true; btn.innerText = "Sending...";
            
            await addDoc(collection(db, 'messages'), data);

            status.innerText = "Message sent successfully!";
            status.classList.remove('hidden');
            contactForm.reset();
            setTimeout(() => { status.classList.add('hidden'); btn.disabled = false; btn.innerText = "Send Message"; }, 5000);
        } catch (error) {
            status.innerText = "Failed to send message.";
            status.classList.remove('hidden');
            btn.disabled = false;
        }
    });
}

// --- UI Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu
    const btn = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) btn.addEventListener('click', () => {
        menu.classList.toggle('opacity-0');
        menu.classList.toggle('invisible');
    });

    // --- Auto-Highlight Active Navigation Links (Sidebar & Top Nav) ---
    let currentPath = window.location.pathname.split('/').pop();
    if (!currentPath || currentPath === '/') currentPath = 'index.html';
    
    const navLinks = document.querySelectorAll('#sidebar nav a, header a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;

        try {
            // Use URL parser to safely handle both relative and absolute "https://..." links
            const linkUrl = new URL(href, window.location.origin);
            
            if (linkUrl.hostname === window.location.hostname || !linkUrl.hostname) {
                let linkPath = linkUrl.pathname.split('/').pop();
                if (!linkPath || linkPath === '/') linkPath = 'index.html';
                
                if (linkPath === currentPath) {
                    link.classList.add('text-blue-600', 'dark:text-blue-400', 'font-bold');
                    link.classList.remove('text-slate-600', 'dark:text-slate-300', 'font-medium');
                    if (link.closest('#sidebar')) {
                        link.classList.add('bg-blue-50', 'dark:bg-blue-900/20', 'border-r-4', 'border-blue-600');
                        link.classList.remove('hover:bg-slate-100', 'dark:hover:bg-slate-700/50');
                    }
                } else {
                    link.classList.add('text-slate-600', 'dark:text-slate-300', 'font-medium');
                    link.classList.remove('text-blue-600', 'dark:text-blue-400', 'font-bold', 'bg-blue-50', 'dark:bg-blue-900/20', 'border-r-4', 'border-blue-600');
                    if (link.closest('#sidebar')) {
                        link.classList.add('hover:bg-slate-100', 'dark:hover:bg-slate-700/50');
                    }
                }
            }
        } catch (e) { /* Ignore parsing errors for mailto: etc */ }
    });

    // Modals
    const toggleModal = (id, show) => { const el = document.getElementById(id); if(el) show ? el.classList.add('active') : el.classList.remove('active'); };
    
    document.getElementById('openReviewModal')?.addEventListener('click', () => toggleModal('reviewModal', true));
    document.getElementById('closeModal')?.addEventListener('click', () => toggleModal('reviewModal', false));
    
    document.getElementById('openTosModal')?.addEventListener('click', (e) => { e.preventDefault(); toggleModal('tosModal', true); });
    document.getElementById('closeTosModal')?.addEventListener('click', () => toggleModal('tosModal', false));
    document.getElementById('acceptTos')?.addEventListener('click', () => toggleModal('tosModal', false));

    document.getElementById('openPrivacyModal')?.addEventListener('click', (e) => { e.preventDefault(); toggleModal('privacyModal', true); });
    document.getElementById('closePrivacyModal')?.addEventListener('click', () => toggleModal('privacyModal', false));
    document.getElementById('acceptPrivacy')?.addEventListener('click', () => toggleModal('privacyModal', false));

    // Cookie Banner
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner && !localStorage.getItem('cookiesAccepted')) {
        setTimeout(() => cookieBanner.classList.remove('translate-y-full'), 1500);
    }
    document.getElementById('acceptCookies')?.addEventListener('click', () => {
        localStorage.setItem('cookiesAccepted', 'true');
        cookieBanner?.classList.add('translate-y-full');
    });

    // Star Rating Visuals
    const stars = document.querySelectorAll('.star-rating button');
    stars.forEach(s => s.addEventListener('click', () => { 
        const val = s.dataset.value; 
        stars.forEach(btn => {
            if (btn.dataset.value <= val) btn.classList.add('active');
            else btn.classList.remove('active');
            btn.style.removeProperty('color');
        });
    }));

    // --- Source Provider Dynamic UI Update ---
    const sourceProvider = document.getElementById("sourceProvider");
    const userLabel = document.getElementById("userLabel");
    const repoLabel = document.getElementById("repoLabel");
    const userInput = document.getElementById("user");
    const repoInput = document.getElementById("repo");
    const branchInput = document.getElementById("branch");

    if (sourceProvider && userLabel && repoLabel && userInput && repoInput && branchInput) {
        const updateProviderUI = () => {
            const provider = sourceProvider.value;

            switch (provider) {
                case "gh": // GitHub
                    userLabel.textContent = "GitHub Username";
                    userInput.placeholder = "e.g., facebook";
                    repoLabel.textContent = "Repository";
                    repoInput.placeholder = "e.g., react";
                    if (!branchInput.value || branchInput.value === 'master') branchInput.value = "main";
                    break;
                case "gl": // GitLab
                    userLabel.textContent = "GitLab Group / User";
                    userInput.placeholder = "e.g., gitlab-org";
                    repoLabel.textContent = "Project";
                    repoInput.placeholder = "e.g., gitlab-foss";
                    if (!branchInput.value || branchInput.value === 'master') branchInput.value = "main";
                    break;
                case "bb": // Bitbucket
                    userLabel.textContent = "Bitbucket Workspace";
                    userInput.placeholder = "e.g., atlassian";
                    repoLabel.textContent = "Repository";
                    repoInput.placeholder = "e.g., aui";
                    if (!branchInput.value || branchInput.value === 'main') branchInput.value = "master";
                    document.getElementById("branchWrapper").classList.remove('hidden');
                    document.getElementById("autoMinifyWrapper").classList.add('hidden');
                    break;
                case "npm": // NPM
                    userLabel.textContent = "Package Name";
                    userInput.placeholder = "e.g., bootstrap";
                    repoLabel.textContent = "Version";
                    repoInput.placeholder = "e.g., 5.3.0 (or leave empty for latest)";
                    document.getElementById("branchWrapper").classList.add('hidden');
                    document.getElementById("autoMinifyWrapper").classList.remove('hidden');
                    break;
                case "wp": // WordPress
                    userLabel.textContent = "Type";
                    userInput.placeholder = "plugins or themes";
                    repoLabel.textContent = "Slug";
                    repoInput.placeholder = "e.g., elementor";
                    document.getElementById("branchLabel").textContent = "Version / Branch";
                    branchInput.placeholder = "e.g., trunk or 1.0.0";
                    branchInput.value = "trunk";
                    document.getElementById("branchWrapper").classList.remove('hidden');
                    document.getElementById("autoMinifyWrapper").classList.remove('hidden');
                    break;
            }
        };
        sourceProvider.addEventListener("change", updateProviderUI);
        
        // Auto-fetch branches when repo loses focus
        repoInput.addEventListener('blur', fetchBranches);

        // Auto-fetch files when a new branch is selected/typed
        branchInput.addEventListener('change', () => {
            if (userInput.value && repoInput.value) {
                fetchFiles();
            }
        });

        // Re-fetch branches if provider changes while fields are filled
        sourceProvider.addEventListener("change", () => {
            if (userInput.value && repoInput.value) {
                fetchBranches();
            }
        });
        
        updateProviderUI(); // Run once on load
    }

    // Initialize App
    initAuth();

    // Load Blog Feed
    if (document.getElementById("blog-container")) {
        const script = document.createElement('script');
        script.src = "https://webcodeze.blogspot.com/feeds/posts/default?alt=json-in-script&max-results=3&callback=showBlogs";
        document.body.appendChild(script);
    }
});

// =======================================================
// --- ADMIN PANEL LOGIC ---
// =======================================================

function initAdminPage() {
    const googleLoginBtn = document.getElementById('adminGoogleLoginBtn');
    if (!googleLoginBtn) return; // Exit if not on admin page

    const loginOverlay = document.getElementById('loginOverlay');
    const dashboard = document.getElementById('dashboard');
    const logoutBtn = document.getElementById('logoutBtn');

    let dataInitialized = false;

    // Monitor Auth State
    onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous && user.email === 'anuraggautam4570@gmail.com') {
            // User is the correct admin
            localStorage.setItem('adminAuth', 'true');
            if(loginOverlay) loginOverlay.classList.add('hidden');
            if(dashboard) dashboard.classList.remove('hidden');

            // Update Admin UI Details
            const adminName = document.getElementById('adminNameDisplay');
            const adminEmail = document.getElementById('adminEmailDisplay');
            const adminUid = document.getElementById('adminUidDisplay');
            if(adminName) adminName.innerText = user.displayName || 'Administrator';
            if(adminEmail) adminEmail.innerText = user.email;
            if(adminUid) adminUid.innerText = 'ID: ' + user.uid.substring(0, 6) + '...';

            if(!dataInitialized) {
                initData();
                dataInitialized = true;
            }
        } else {
            // User is not admin, or is logged out
            if (user) {
                // If a user is logged in but it's not the admin, sign them out.
                signOut(auth);
            }
            localStorage.removeItem('adminAuth');
            if(loginOverlay) loginOverlay.classList.remove('hidden');
            if(dashboard) dashboard.classList.add('hidden');
        }
    });

    googleLoginBtn.addEventListener('click', async () => {
        const originalText = googleLoginBtn.innerHTML;
        googleLoginBtn.innerHTML = "Verifying...";
        googleLoginBtn.disabled = true;

        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (result.user.email !== 'anuraggautam4570@gmail.com') {
                await signOut(auth);
                alert("Access Denied. This account is not authorized for admin access.");
            } else {
                if("Notification" in window) Notification.requestPermission();
            }
        } catch (error) {
            console.error(error);
            alert("Login Failed: " + error.message);
        } finally {
            googleLoginBtn.innerHTML = originalText;
            googleLoginBtn.disabled = false;
        }
    });

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            location.reload();
        });
    }

    const maintenanceToggle = document.getElementById('maintenanceToggle');
    if(maintenanceToggle) {
        maintenanceToggle.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            const settingsRef = doc(db, 'settings', 'config');
            try {
                await setDoc(settingsRef, { maintenanceMode: isEnabled }, { merge: true });
                const status = isEnabled ? 'enabled' : 'disabled';
                const toggleLabel = e.target.closest('label');
                toggleLabel.classList.add('scale-active');
                setTimeout(() => toggleLabel.classList.remove('scale-active'), 200);
            } catch (error) {
                console.error("Failed to update maintenance mode:", error);
                alert('Failed to update setting: ' + error.message);
                e.target.checked = !isEnabled; // Revert toggle on error
            }
        });
    }

    // Admin Data & State
    let messagesData = [];
    let subscribersData = [];
    let reviewsData = [];
    let statsData = [];
    let usersData = [];
    let chartInstance = null;
    let currentUserProviderFilter = 'all';
    let selectedUserIds = new Set();
    let currentRange = '7d';

    // Enhanced Notification function for Admin Panel
    const notify = (title, body) => {
        if(Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'https://cdn-icons-png.flaticon.com/512/1827/1827301.png' });
        }
        
        // Show in-app toast for Admin
        const toast = document.createElement('div');
        toast.className = 'fixed top-5 right-5 bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-4 border border-slate-200 dark:border-slate-700 z-[9999] max-w-sm transition-all duration-300 transform translate-x-full opacity-0 flex items-center gap-3';
        toast.innerHTML = `
            <div class="bg-blue-100 text-blue-600 p-2 rounded-full"></div>
            <div>
                <h4 class="font-bold text-sm text-slate-900 dark:text-white">${title}</h4>
                <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${body}</p>
            </div>
        `;
        document.body.appendChild(toast);
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
        
        requestAnimationFrame(() => toast.classList.remove('translate-x-full', 'opacity-0'));
        setTimeout(() => { toast.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 5000);
    };

    async function initData() {
        if (!auth.currentUser) await signInAnonymously(auth);

        // 1. Messages
        let firstMsg = true;
        onSnapshot(query(collection(db, 'messages'), orderBy('timestamp', 'desc')), (snapshot) => {
            messagesData = [];
            snapshot.forEach(d => messagesData.push({id: d.id, ...d.data()}));
            
            if(!firstMsg) {
                snapshot.docChanges().forEach(c => {
                    if(c.type === 'added') notify('New Message', `From: ${c.doc.data().name || 'User'}`);
                });
            }
            firstMsg = false;

            renderMessages(messagesData);
            updateStats();
        }, (error) => {
            document.getElementById('messagesList').innerHTML = `<p class="text-red-500 text-center text-sm py-4">Error: ${error.message}</p>`;
        });

        // 2. Subscribers
        let firstSub = true;
        onSnapshot(query(collection(db, 'subscribers'), orderBy('timestamp', 'desc')), (snapshot) => {
            subscribersData = [];
            snapshot.forEach(d => subscribersData.push({id: d.id, ...d.data()}));
            
            if(!firstSub) {
                snapshot.docChanges().forEach(c => {
                    if(c.type === 'added') notify('New Subscriber', `${c.doc.data().email} joined!`);
                });
            }
            firstSub = false;

            renderSubscribers(subscribersData);
            updateStats();
        }, (error) => {
            document.getElementById('subscribersList').innerHTML = `<p class="text-red-500 text-center text-sm py-4">Error: ${error.message}</p>`;
        });

        // 3. Reviews
        let firstRev = true;
        onSnapshot(collection(db, 'reviews'), (snapshot) => {
            reviewsData = [];
            snapshot.forEach(d => reviewsData.push({id: d.id, ...d.data()}));
            
            // Client-side sort to avoid missing index errors
            reviewsData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            
            if(!firstRev) {
                snapshot.docChanges().forEach(c => {
                    if(c.type === 'added') notify('New Review', `${c.doc.data().rating} stars from ${c.doc.data().name}`);
                });
            }
            firstRev = false;

            renderReviews(reviewsData);
            updateStats();
        }, (error) => {
            document.getElementById('reviewsList').innerHTML = `<p class="text-red-500 text-center col-span-full text-sm py-4">Error: ${error.message}</p>`;
        });

        // 4. Users
        onSnapshot(query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(100)), (snapshot) => {
            usersData = [];
            snapshot.forEach(d => usersData.push({id: d.id, ...d.data()}));

            renderUsers(usersData);
            const countEl = document.getElementById('userCount');
            if(countEl) countEl.innerText = `${usersData.length} Active Users`;
        }, (error) => {
            console.error("Users error:", error);
            const list = document.getElementById('usersList');
            let msg = "Error loading users.";
            if (error.code === 'failed-precondition') {
                msg = "Missing Index. Open browser console (F12) and click the link to create it.";
            } else if (error.code === 'permission-denied') {
                msg = "Permission Denied. Check Firestore Rules.";
            }
            if(list) list.innerHTML = `<p class="text-red-500 text-center text-sm py-4">${msg}</p>`;
        });

        // 4. Site Stats
        onSnapshot(collection(db, 'site_stats'), (snapshot) => {
            statsData = [];
            snapshot.forEach(d => statsData.push({ date: d.id, ...d.data() }));
            updateStats();
            window.updateChart(currentRange);
        }, (error) => {
            console.error("Stats error:", error);
            document.getElementById('statTraffic').innerText = "Err";
            document.getElementById('statTime').innerText = "Err";
        });

        // 5. Settings
        const settingsRef = doc(db, 'settings', 'config');
        onSnapshot(settingsRef, (docSnap) => {
            const maintenanceMsgInput = document.getElementById('maintenanceMsgInput');
            const scheduledStatus = document.getElementById('scheduledStatus');
            const scheduledTimeDisplay = document.getElementById('scheduledTimeDisplay');

            if (docSnap.exists()) {
                const data = docSnap.data();
                if(maintenanceToggle) maintenanceToggle.checked = data.maintenanceMode === true;
                if(maintenanceMsgInput) maintenanceMsgInput.value = data.message || '';
                if (data.scheduledStart && scheduledStatus) {
                    scheduledTimeDisplay.innerText = data.scheduledStart.toDate().toLocaleString();
                    scheduledStatus.classList.remove('hidden');
                } else if(scheduledStatus) {
                    scheduledStatus.classList.add('hidden');
                }
            }
        }, (error) => {
            console.error("Settings error:", error);
        });

        document.getElementById('saveMaintenanceMsg')?.addEventListener('click', async () => {
            const message = document.getElementById('maintenanceMsgInput').value;
            const btn = document.getElementById('saveMaintenanceMsg');
            try {
                await setDoc(settingsRef, { message }, { merge: true });
                btn.innerText = "Saved!"; setTimeout(() => btn.innerText = "Save", 2000);
            } catch (e) { console.error(e); alert("Error saving message: " + e.message); }
        });

        document.getElementById('saveScheduleBtn')?.addEventListener('click', async () => {
            const val = document.getElementById('scheduleInput').value;
            if (!val) return alert("Select a date/time");
            const date = new Date(val);
            if (date < new Date()) return alert("Select a future time");
            try {
                await setDoc(settingsRef, { scheduledStart: Timestamp.fromDate(date) }, { merge: true });
                document.getElementById('scheduleInput').value = '';
            } catch (e) {
                alert("Error scheduling maintenance: " + e.message);
            }
        });

        document.getElementById('cancelScheduleBtn')?.addEventListener('click', async () => {
            try {
                await setDoc(settingsRef, { scheduledStart: null }, { merge: true });
            } catch (e) {
                alert("Error cancelling schedule: " + e.message);
            }
        });

        // 6. Announcement
        const announcementRef = doc(db, 'settings', 'announcement');
        onSnapshot(announcementRef, (snap) => {
            if(snap.exists()) {
                const data = snap.data();
                const msg = document.getElementById('announcementMsg');
                const toggle = document.getElementById('announcementToggle');
                const type = document.getElementById('announcementType');
                if(msg) msg.value = data.message || '';
                if(toggle) toggle.checked = data.active || false;
                if(type) type.value = data.type || 'info';
            }
        }, (error) => {
            console.error("Announcement error:", error);
        });

        // 7. User Activity Feed (Admin View)
        onSnapshot(query(collection(db, 'user_activity'), orderBy('timestamp', 'desc'), limit(20)), (snapshot) => {
            const tbody = document.getElementById('activityTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            
            if(snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No activity recorded yet.</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const d = doc.data();
                const time = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
                const deviceBadge = d.deviceType === 'Mobile' 
                    ? '<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Mobile</span>' 
                    : '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Desktop</span>';

                tbody.innerHTML += `
                    <tr class="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                        <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${time}</td>
                        <td class="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">${d.city || 'Unknown'}, ${d.country || 'Unknown'}</td>
                        <td class="px-4 py-3">${deviceBadge}</td>
                        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">${d.os || 'OS'} / ${d.browser || 'Browser'}</td>
                        <td class="px-4 py-3 text-xs font-mono text-gray-400">${d.ip || '0.0.0.0'}</td>
                    </tr>
                `;
            });
        });

        document.getElementById('saveAnnouncement')?.addEventListener('click', async () => {
            const message = document.getElementById('announcementMsg').value;
            const active = document.getElementById('announcementToggle').checked;
            const type = document.getElementById('announcementType').value;
            const btn = document.getElementById('saveAnnouncement');
            try {
                await setDoc(announcementRef, { message, active, type, timestamp: serverTimestamp() });
                btn.innerText = "Sent!"; setTimeout(() => btn.innerText = "Send Push", 2000);
            } catch (e) {
                alert("Error sending announcement: " + e.message);
            }
        });

        // 8. Ads
        const adsRef = doc(db, 'settings', 'ads');
        onSnapshot(adsRef, (snap) => {
            if(snap.exists()) {
                const data = snap.data();
                const adSidebar = document.getElementById('adSidebar');
                const adBanner = document.getElementById('adBanner');
                if(adSidebar) adSidebar.value = data.sidebar || '';
                if(adBanner) adBanner.value = data.banner || '';

                const adSidebarToggle = document.getElementById('adSidebarToggle');
                const adBannerToggle = document.getElementById('adBannerToggle');
                if (adSidebarToggle) adSidebarToggle.checked = data.sidebar_enabled === true;
                if (adBannerToggle) adBannerToggle.checked = data.banner_enabled === true;

                const adBgColor = document.getElementById('adBgColor');
                if (adBgColor) adBgColor.value = data.bgColor || '#ffffff';
            }
        }, (error) => {
            console.error("Ads error:", error);
        });

        document.getElementById('saveAdsBtn')?.addEventListener('click', async () => {
            const sidebarCode = document.getElementById('adSidebar').value;
            const bannerCode = document.getElementById('adBanner').value;
            const btn = document.getElementById('saveAdsBtn');
            try {
                await setDoc(adsRef, { sidebar: sidebarCode, banner: bannerCode }, { merge: true });
                btn.innerText = "Saved!"; setTimeout(() => btn.innerText = "Save Ad Codes", 2000);
            } catch (e) { alert("Error saving ad codes: " + e.message); }
        });

        document.getElementById('adSidebarToggle')?.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            try {
                await setDoc(adsRef, { sidebar_enabled: isEnabled }, { merge: true });
            } catch (error) {
                alert('Failed to update setting: ' + error.message);
                e.target.checked = !isEnabled;
            }
        });

        document.getElementById('adBannerToggle')?.addEventListener('change', async (e) => {
            const isEnabled = e.target.checked;
            try {
                await setDoc(adsRef, { banner_enabled: isEnabled }, { merge: true });
            } catch (error) {
                alert('Failed to update setting: ' + error.message);
                e.target.checked = !isEnabled;
            }
        });

        document.getElementById('saveAdColorBtn')?.addEventListener('click', async () => {
            const color = document.getElementById('adBgColor').value;
            const btn = document.getElementById('saveAdColorBtn');
            try {
                await setDoc(adsRef, { bgColor: color }, { merge: true });
                btn.innerText = "Saved!"; setTimeout(() => btn.innerText = "Save", 2000);
            } catch (e) { alert("Error saving color: " + e.message); }
        });

        // 9. Change Password (Admin)
        document.getElementById('btnChangePass')?.addEventListener('click', async () => {
            const newPass = document.getElementById('newPassword').value;
            if(newPass.length < 6) return alert("Password must be at least 6 characters.");
            try {
                await updatePassword(auth.currentUser, newPass);
                alert("Password updated successfully!");
                document.getElementById('newPassword').value = '';
            } catch (e) {
                alert("Error: Please logout and login via Email to change password. This is required for security.");
            }
        });

        // 10. Quick Notification
        document.getElementById('sendQuickNotification')?.addEventListener('click', async () => {
            const message = document.getElementById('quickNotifyMessage').value;
            const userId = document.getElementById('quickNotifyUserId').value;
            if (!message || !userId) return alert("Message and User ID are required.");
            
            if (confirm(`Send notification to user ${userId}?`)) {
                try {
                    await addDoc(collection(db, 'notifications'), { userId, message, read: false, timestamp: serverTimestamp() });
                    alert("Notification sent!");
                    document.getElementById('quickNotifyMessage').value = '';
                    document.getElementById('quickNotifyUserId').value = '';
                } catch (e) {
                    alert("Error sending notification: " + e.message);
                }
            }
        });

        document.getElementById('sendQuickNotificationToAll')?.addEventListener('click', async () => {
            const message = document.getElementById('quickNotifyMessage').value;
            if (!message) return alert("Message is required.");
            
            if (confirm(`This will send a notification to ALL ${usersData.length} users. Are you sure?`)) {
                try {
                    const MAX_BATCH_SIZE = 450;
                    const batches = [];
                    let currentBatch = writeBatch(db);
                    let operationCount = 0;

                    usersData.forEach(user => {
                        const ref = doc(collection(db, 'notifications'));
                        currentBatch.set(ref, { userId: user.id, message, read: false, timestamp: serverTimestamp() });
                        operationCount++;
                        if (operationCount === MAX_BATCH_SIZE) {
                            batches.push(currentBatch.commit());
                            currentBatch = writeBatch(db);
                            operationCount = 0;
                        }
                    });

                    if (operationCount > 0) batches.push(currentBatch.commit());
                    await Promise.all(batches);

                    alert(`Notifications sent to all ${usersData.length} users.`);
                    document.getElementById('quickNotifyMessage').value = '';
                } catch (e) {
                    alert("Error sending bulk notifications: " + e.message);
                }
            }
        });
    }

    function updateStats() {
        const msgEl = document.getElementById('statMessages');
        const subEl = document.getElementById('statSubscribers');
        const rateEl = document.getElementById('statRating');
        const trafficEl = document.getElementById('statTraffic');
        const timeEl = document.getElementById('statTime');

        if(msgEl) msgEl.innerText = messagesData.length;
        if(subEl) subEl.innerText = subscribersData.length;
        
        if(reviewsData.length > 0 && rateEl) {
            const avg = reviewsData.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviewsData.length;
            rateEl.innerText = avg.toFixed(1) + " ★";
        } else if(rateEl) { rateEl.innerText = "0.0"; }

        // Traffic & Time
        let totalViews = 0;
        let totalDuration = 0;
        statsData.forEach(d => {
            totalViews += (d.views || 0);
            totalDuration += (d.totalDuration || 0);
        });
        if(trafficEl) trafficEl.innerText = totalViews;
        const avgTime = totalViews > 0 ? Math.round(totalDuration / totalViews) : 0;
        if(timeEl) timeEl.innerText = avgTime + "s";
    }

    window.updateChart = (range) => {
        currentRange = range;
        // Update Buttons
        ['7d', '1m', '1y'].forEach(r => {
            const btn = document.getElementById(`btn-${r}`);
            if(btn) {
                if(r === range) {
                    btn.className = "px-4 py-1.5 text-sm font-medium rounded-md transition-all bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-300 shadow-sm";
                } else {
                    btn.className = "px-4 py-1.5 text-sm font-medium rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200";
                }
            }
        });

        // Filter Data
        const now = new Date();
        const cutoff = new Date();
        if(range === '7d') cutoff.setDate(now.getDate() - 7);
        if(range === '1m') cutoff.setDate(now.getDate() - 30);
        if(range === '1y') cutoff.setFullYear(now.getFullYear() - 1);

        const sorted = [...statsData].sort((a, b) => a.date.localeCompare(b.date));
        const filtered = sorted.filter(d => new Date(d.date) >= cutoff);

        const labels = filtered.map(d => d.date);
        const data = filtered.map(d => d.views || 0);

        const ctx = document.getElementById('trafficChart')?.getContext('2d');
        if(!ctx) return;

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        if(chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Page Views',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    };

    function renderMessages(data) {
        const list = document.getElementById('messagesList');
        if(!list) return;
        list.innerHTML = '';
        if(data.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center text-sm">No messages found.</p>'; return; }
        let html = "";
        data.forEach(d => {
            const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleString() : 'Just now';
            const id = escapeJsStringForOnclick(d.id);
            const userId = escapeJsStringForOnclick(d.userId || '');
            const name = escapeHtml(d.name || 'Unknown');
            const nameForOnclick = escapeJsStringForOnclick(d.name || 'User');
            const email = escapeHtml(d.email || '');
            const emailHref = escapeHtmlAttribute(`mailto:${d.email || ''}?subject=Re: GitDelivr Inquiry`);
            const message = escapeHtml(d.message || '');
            const replyAction = d.userId 
                ? `<button onclick="window.openReplyModal('${userId}', '${nameForOnclick}')" class="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-lg transition-colors">Reply</button>`
                : `<a href="${emailHref}" class="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">Email</a>`;

            html += `<div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-slate-600 relative group hover:shadow-md transition-shadow"><div class="flex justify-between items-start mb-2"><div><h3 class="font-bold text-sm text-slate-800 dark:text-white">${name}</h3><p class="text-xs text-blue-500">${email}</p></div><span class="text-xs text-gray-400">${date}</span></div><p class="text-sm text-gray-600 dark:text-gray-300 mb-3">${message}</p><div class="flex justify-end">${replyAction}</div><button onclick="window.deleteItem('messages', '${id}')" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1" title="Delete"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>`;
        });
        list.innerHTML = html;
    }

    function renderSubscribers(data) {
        const list = document.getElementById('subscribersList');
        if(!list) return;
        list.innerHTML = '';
        if(data.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center text-sm">No subscribers yet.</p>'; return; }
        let html = "";
        data.forEach(d => {
            const date = d.timestamp ? new Date(d.timestamp.seconds * 1000).toLocaleDateString() : 'Just now';
            html += `<div class="flex justify-between items-center bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-600 group hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"><span class="text-sm font-mono text-slate-700 dark:text-slate-200">${escapeHtml(d.email || '')}</span><div class="flex items-center gap-3"><span class="text-xs text-gray-400">${date}</span><button onclick="window.deleteItem('subscribers', '${escapeJsStringForOnclick(d.id)}')" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div></div>`;
        });
        list.innerHTML = html;
    }

    function renderReviews(data) {
        const list = document.getElementById('reviewsList');
        if(!list) return;
        list.innerHTML = '';
        if(data.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center col-span-full text-sm">No reviews yet.</p>'; return; }
        let html = "";
        data.forEach(d => {
            const rating = Math.max(0, Math.min(5, Number(d.rating) || 0));
            html += `<div class="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border border-gray-100 dark:border-slate-600 relative group hover:shadow-md transition-shadow"><div class="flex justify-between mb-2"><span class="font-bold text-sm text-slate-800 dark:text-white">${escapeHtml(d.name || 'Anonymous')}</span><span class="text-yellow-500 text-xs">${"★".repeat(rating)}</span></div><p class="text-xs text-gray-600 dark:text-gray-300 italic">"${escapeHtml(d.text || '')}"</p><button onclick="window.deleteItem('reviews', '${escapeJsStringForOnclick(d.id)}')" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></div>`;
        });
        list.innerHTML = html;
    }

    function renderUsers(data) {
        const list = document.getElementById('usersList');
        if(!list) return;
        list.innerHTML = '';
        if(data.length === 0) { list.innerHTML = '<p class="text-gray-400 text-center text-sm">No users found.</p>'; return; }
        let html = "";
        data.forEach(d => {
            const lastLogin = d.lastLogin ? new Date(d.lastLogin.seconds * 1000).toLocaleString() : 'Never';
            const photo = safeExternalUrl(d.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'User')}&background=random`);
            const name = escapeHtml(d.name || 'Unknown');
            const email = escapeHtml(d.email || 'No Email');
            const provider = d.provider || 'email'; // Default to email for older users
            const isChecked = selectedUserIds.has(d.id) ? 'checked' : '';
            const id = escapeJsStringForOnclick(d.id);

            let providerBadge = '';
            if (provider === 'github.com') {
                providerBadge = '<span class="ml-2 bg-slate-800 dark:bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full">GitHub</span>';
            } else if (provider === 'google.com') {
                providerBadge = '<span class="ml-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Google</span>';
            }
            
            html += `
                <div class="flex items-center justify-between bg-gray-50 dark:bg-slate-700 p-3 rounded-lg border border-gray-100 dark:border-slate-600 group hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" class="user-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500" value="${escapeHtmlAttribute(d.id)}" ${isChecked} onclick="window.toggleUserSelection('${id}')">
                        <img src="${escapeHtmlAttribute(photo)}" class="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-500" alt="">
                        <div>
                            <p class="text-sm font-bold text-slate-800 dark:text-white flex items-center">${name} ${providerBadge}</p>
                            <p class="text-xs text-slate-500">${email}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right hidden sm:block">
                            <p class="text-[10px] text-slate-400 uppercase tracking-wider">Last Login</p>
                            <p class="text-xs text-slate-600 dark:text-slate-300">${lastLogin}</p>
                        </div>
                        <button onclick="window.deleteItem('users', '${id}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Delete User">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button onclick="window.openNotificationModal('${id}')" class="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Send Notification">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                        </button>
                    </div>
                </div>`;
        });
        list.innerHTML = html;
        updateBulkUI();
    }

    window.toggleUserSelection = (id) => {
        if (selectedUserIds.has(id)) selectedUserIds.delete(id);
        else selectedUserIds.add(id);
        updateBulkUI();
    };

    // --- Select All Logic ---
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const checkboxes = document.querySelectorAll('.user-checkbox');
            selectedUserIds.clear();
            checkboxes.forEach(cb => {
                cb.checked = isChecked;
                if (isChecked) selectedUserIds.add(cb.value);
            });
            updateBulkUI();
        });
    }

    function updateBulkUI() {
        const btn = document.getElementById('sendToSelectedBtn');
        if(btn) {
            if (selectedUserIds.size > 0) {
                btn.classList.remove('hidden');
                btn.innerText = `Send to ${selectedUserIds.size} Selected`;
            } else {
                btn.classList.add('hidden');
            }
        }
    }

    // --- Bulk Send Button Click ---
    const sendSelectedBtn = document.getElementById('sendToSelectedBtn');
    if (sendSelectedBtn) {
        sendSelectedBtn.addEventListener('click', () => {
            document.getElementById('notifyUserId').value = ''; // Clear single user ID
            document.getElementById('notificationModal').classList.remove('hidden');
            const title = document.querySelector('#notificationModal h3');
            if(title) title.innerHTML = `<span class="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 text-lg">🔔</span> Send to ${selectedUserIds.size} Users`;
        });
    }

    window.filterUsersByProvider = (provider) => {
        currentUserProviderFilter = provider;
        document.querySelectorAll('#userFilters button').forEach(btn => {
            btn.classList.remove('bg-white', 'dark:bg-slate-600', 'text-blue-600', 'dark:text-blue-300', 'shadow-sm');
            btn.classList.add('text-slate-600', 'dark:text-slate-300');
        });
        const activeBtn = document.querySelector(`#userFilters button[onclick="window.filterUsersByProvider('${provider}')"]`);
        if (activeBtn) {
             activeBtn.classList.remove('text-slate-600', 'dark:text-slate-300');
             activeBtn.classList.add('bg-white', 'dark:bg-slate-600', 'text-blue-600', 'dark:text-blue-300', 'shadow-sm');
        }
        // re-run the search/filter logic
        document.getElementById('searchUsers').dispatchEvent(new Event('input'));
    };

    document.getElementById('searchMessages')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = messagesData.filter(m => (m.name && m.name.toLowerCase().includes(term)) || (m.email && m.email.toLowerCase().includes(term)) || (m.message && m.message.toLowerCase().includes(term)));
        renderMessages(filtered);
    });

    document.getElementById('searchUsers')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        let filtered = usersData;

        if (currentUserProviderFilter !== 'all') {
            filtered = filtered.filter(u => (u.provider || 'email') === currentUserProviderFilter);
        }

        if (term) {
            filtered = filtered.filter(u => 
                (u.name && u.name.toLowerCase().includes(term)) || 
                (u.email && u.email.toLowerCase().includes(term))
            );
        }
        renderUsers(filtered);
    });

    // Admin Notification Logic
    window.openNotificationModal = (uid) => {
        document.getElementById('notifyUserId').value = uid;
        document.getElementById('notificationModal').classList.remove('hidden');
        const title = document.querySelector('#notificationModal h3');
        if(title) title.innerHTML = `<span class="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 text-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg></span> Send Notification`;
    };

    // Admin Reply to Message Logic
    window.openReplyModal = (uid, name) => {
        document.getElementById('notifyUserId').value = uid;
        document.getElementById('notificationModal').classList.remove('hidden');
        const title = document.querySelector('#notificationModal h3');
        if(title) title.innerHTML = `<span class="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 text-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg></span> Reply to ${name}`;
        document.getElementById('notifyMessage').value = `Hi ${name},\n\nRegarding your message:\n`;
    };

    // --- Confirm Send (Handles Single & Bulk) ---
    document.getElementById('confirmSendNotification')?.addEventListener('click', async () => {
        const uid = document.getElementById('notifyUserId').value;
        const message = document.getElementById('notifyMessage').value;
        const btn = document.getElementById('confirmSendNotification');

        if(!message) return alert("Please enter a message");
        
        btn.innerText = "Sending...";
        btn.disabled = true;

        try {
            const MAX_BATCH_SIZE = 450;
            const batches = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;
            let totalCount = 0;

            if (uid) {
                // Single User
                const ref = doc(collection(db, 'notifications'));
                currentBatch.set(ref, { userId: uid, message, read: false, timestamp: serverTimestamp() });
                operationCount++;
                totalCount = 1;
            } else if (selectedUserIds.size > 0) {
                // Bulk Users
                totalCount = selectedUserIds.size;
                selectedUserIds.forEach(userId => {
                    const ref = doc(collection(db, 'notifications'));
                    currentBatch.set(ref, { userId: userId, message, read: false, timestamp: serverTimestamp() });
                    operationCount++;
                    if (operationCount === MAX_BATCH_SIZE) {
                        batches.push(currentBatch.commit());
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                    }
                });
            } else {
                alert("No recipients selected.");
                btn.innerText = "Send";
                btn.disabled = false;
                return;
            }

            if (operationCount > 0) batches.push(currentBatch.commit());
            await Promise.all(batches);
            
            alert(`Successfully sent to ${totalCount} user(s)!`);
            document.getElementById('notifyMessage').value = '';
            document.getElementById('notificationModal').classList.add('hidden');
            
            // Reset Bulk UI if needed
            if (!uid) {
                selectedUserIds.clear();
                if(selectAllCheckbox) selectAllCheckbox.checked = false;
                document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
                updateBulkUI();
            }

        } catch (e) {
            console.error(e);
            alert("Error sending notifications: " + e.message);
        } finally {
            btn.innerText = "Send";
            btn.disabled = false;
        }
    });

    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,Email,Date\n";
        subscribersData.forEach(row => {
            const date = row.timestamp ? new Date(row.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown';
            csvContent += `${row.email},${date}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "subscribers.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    window.deleteItem = async (col, id) => { 
        if(confirm('Delete this item?')) {
            await deleteDoc(doc(db, col, id)); 
        }
    };
}

initAdminPage();

// 1. Apne Worker ka URL yahan set karein
const WORKER_URL = "cdn.gitdelivr.in";

// 2. Proxy Helper Function (Ise script mein kahin bhi add kar dein)
function getProxyUrl(targetUrl) {
    // Agar link pakshi.in ka hai, toh proxy use karo, warna original
    if (targetUrl.includes('pakshi.in')) {
        return `${WORKER_URL}/proxy?url=${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl; // Baaki links normal rahenge
}

// 3. Jahan aap video ka URL set kar rahe hain, wahan ye logic apply karein
// Example: Aapke video player logic mein jahan aap src change karte ho
function loadVideo(originalLink) {
    const finalLink = getProxyUrl(originalLink);
    
    const videoPlayer = document.getElementById('myVideoPlayer');
    videoPlayer.src = finalLink;
    videoPlayer.play();
}

// Example: Agar aap fetch use kar rahe ho
async function fetchData(url) {
    const safeUrl = getProxyUrl(url);
    const response = await fetch(safeUrl);
    const data = await response.json();
    console.log(data);
}
