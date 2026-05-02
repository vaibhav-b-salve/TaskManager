// Handle login
async function handleLogin(email, password) {
    try {
        const data = await api.login({ email, password });
        api.setToken(data.token);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showToast('Login successful!');
        await initApp(data.user);
        
        return true;
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

// Handle signup
async function handleSignup(name, email, password, role) {
    try {
        const data = await api.signup({ name, email, password, role });
        api.setToken(data.token);
        
        // Store user data
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showToast('Signup successful!');
        await initApp(data.user);
        
        return true;
    } catch (error) {
        showToast(error.message, 'error');
        return false;
    }
}

// Handle logout
function handleLogout() {
    api.setToken(null);
    localStorage.removeItem('user');
    currentUser = null;
    
    document.getElementById('navbar').style.display = 'none';
    showPage('loginPage');
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
    
    showToast('Logged out successfully');
}

// Check if user is already logged in
async function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        api.setToken(token);
        try {
            // Verify token is still valid
            await api.getCurrentUser();
            await initApp(JSON.parse(user));
            return true;
        } catch (error) {
            // Token is invalid
            handleLogout();
            return false;
        }
    }
    return false;
}

// Initialize auth event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Show login page by default
    showPage('loginPage');
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            await handleLogin(email, password);
        };
    }
    
    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const role = document.getElementById('signupRole').value;
            await handleSignup(name, email, password, role);
        };
    }
    
    // Show/hide auth forms
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    
    if (showSignup) {
        showSignup.onclick = (e) => {
            e.preventDefault();
            showPage('signupPage');
        };
    }
    
    if (showLogin) {
        showLogin.onclick = (e) => {
            e.preventDefault();
            showPage('loginPage');
        };
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }
    
    // Check if user is already logged in
    checkAuth();
});