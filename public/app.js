import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyC_U_pYSYWNm6Q1ufFwQE_tYlQZIYeDU0g",
    authDomain: "gitdelivr.in",
    projectId: "cdn-generator",
    storageBucket: "cdn-generator.firebasestorage.app",
    messagingSenderId: "44677120607",
    appId: "1:44677120607:web:b4719f7b7c6414cd19d1ea",
    measurementId: "G-9RK16SGB09"
};

const recaptchaSiteKey = window.GITDELIVR_RECAPTCHA_SITE_KEY || "";
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

if (recaptchaSiteKey) {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true
    });
}

export { app, firebaseConfig };
