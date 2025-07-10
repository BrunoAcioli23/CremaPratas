// --- LÓGICA DE TROCA DE FORMULÁRIO ---
        const loginFormContainer = document.getElementById('login-form');
        const registerFormContainer = document.getElementById('register-form');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');

        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

        const auth = getAuth();

        document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Usuário registrado com sucesso!");
            window.location.href = "index.html";
        } catch (error) {
            alert("Erro ao registrar: " + error.message);
        }
        });


        showRegisterLink.addEventListener('click', () => {
            loginFormContainer.classList.remove('active');
            registerFormContainer.classList.add('active');
        });

        showLoginLink.addEventListener('click', () => {
            registerFormContainer.classList.remove('active');
            loginFormContainer.classList.add('active');
        });

        // --- LÓGICA DE LOGIN ---
        const loginForm = document.querySelector('#login-form form');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                showMessage('Login bem-sucedido! Redirecionando...', 'success');
                window.location.href = 'index.html'; 
            } catch (error) {
                showMessage(getFriendlyAuthError(error.code), 'error');
            }
        });

        // --- LÓGICA DE CADASTRO ---
        const registerForm = document.querySelector('#register-form form');
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    displayName: name,
                    email: email,
                    createdAt: serverTimestamp(),
                    role: 'customer'
                });

                showMessage('Conta criada com sucesso! Redirecionando...', 'success');
                window.location.href = 'index.html';
            } catch (error) {
                showMessage(getFriendlyAuthError(error.code), 'error');
            }
        });

        // --- FUNÇÕES AUXILIARES ---
        function showMessage(msg, type) {
            const messageArea = document.getElementById('message-area');
            messageArea.textContent = msg;
            messageArea.className = type;
            messageArea.style.display = 'block';
            setTimeout(() => {
                messageArea.style.display = 'none';
            }, 4000);
        }
        
        function getFriendlyAuthError(errorCode) {
            switch (errorCode) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    return 'Email ou senha inválidos.';
                case 'auth/email-already-in-use':
                    return 'Este email já está cadastrado.';
                case 'auth/weak-password':
                    return 'A senha deve ter no mínimo 6 caracteres.';
                case 'auth/invalid-email':
                    return 'O formato do email é inválido.';
                default:
                    return 'Ocorreu um erro. Tente novamente.';
            }
        }