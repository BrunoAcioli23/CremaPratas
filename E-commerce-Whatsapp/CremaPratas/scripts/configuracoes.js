// SUBSTITUA TODO O CONTEÚDO DE configuracoes.js POR ESTE CÓDIGO

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, orderBy, doc, addDoc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
  authDomain: "cremapratas-e70b9.firebaseapp.com",
  projectId: "cremapratas-e70b9",
  storageBucket: "cremapratas-e70b9.appspot.com",
  messagingSenderId: "601950880055",
  appId: "1:601950880055:web:9660320d933ec2468adab2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// --- ELEMENTOS DO DOM ---
const logoutBtn = document.querySelector(".logout-btn");
const orderBox = document.querySelector(".box .empty-box");
const accountDetailsP = document.querySelector(".account-details p strong");
const openModalBtn = document.querySelector(".btn-secondary"); // Botão "VER ENDEREÇOS"

// Elementos do Modal
const accountModal = document.getElementById('account-modal');
const closeModalBtn = document.getElementById('close-account-modal-btn');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const modalMessageArea = document.getElementById('modal-message-area');

// Formulário de Detalhes da Conta
const accountDetailsForm = document.getElementById('account-details-form');
const displayNameInput = document.getElementById('display-name');
const userEmailInput = document.getElementById('user-email');
const userPasswordInput = document.getElementById('user-password');

// Seção de Endereços
const addressList = document.getElementById('address-list');
const addNewAddressBtn = document.getElementById('add-new-address-btn');
const addressForm = document.getElementById('address-form');
const cancelAddressEditBtn = document.getElementById('cancel-address-edit');


// --- FUNÇÕES ---

function showModalMessage(message, type) {
    modalMessageArea.textContent = message;
    modalMessageArea.className = type; // 'success' ou 'error'
    modalMessageArea.classList.remove('hidden');
    setTimeout(() => {
        modalMessageArea.classList.add('hidden');
    }, 4000);
}

// Lógica de abas do modal
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});


// Carregar e exibir endereços
async function loadAddresses() {
    if (!currentUser) return;
    addressList.innerHTML = `<p>Carregando endereços...</p>`;
    const addressesRef = collection(db, "users", currentUser.uid, "addresses");
    const snapshot = await getDocs(query(addressesRef));

    if (snapshot.empty) {
        addressList.innerHTML = `<p>Nenhum endereço cadastrado.</p>`;
    } else {
        addressList.innerHTML = '';
        snapshot.forEach(doc => {
            const address = doc.data();
            const card = document.createElement('div');
            card.className = 'address-card';
            card.innerHTML = `
                <p>
                    ${address.street}<br>
                    ${address.city}, ${address.state}<br>
                    CEP: ${address.zip}
                </p>
                <div class="address-actions">
                    <button class="edit-address-btn" data-id="${doc.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-address-btn" data-id="${doc.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            addressList.appendChild(card);
        });

        // Adicionar listeners aos novos botões
        document.querySelectorAll('.edit-address-btn').forEach(btn => btn.addEventListener('click', e => handleEditAddress(e.currentTarget.dataset.id)));
        document.querySelectorAll('.delete-address-btn').forEach(btn => btn.addEventListener('click', e => handleDeleteAddress(e.currentTarget.dataset.id)));
    }
}


// Salvar ou atualizar endereço
addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const addressId = document.getElementById('address-id').value;
    const addressData = {
        street: document.getElementById('address-street').value,
        city: document.getElementById('address-city').value,
        state: document.getElementById('address-state').value,
        zip: document.getElementById('address-zip').value,
    };

    try {
        let docRef;
        if (addressId) { // Atualizando
            docRef = doc(db, "users", currentUser.uid, "addresses", addressId);
            await setDoc(docRef, addressData);
        } else { // Criando novo
            docRef = collection(db, "users", currentUser.uid, "addresses");
            await addDoc(docRef, addressData);
        }
        showModalMessage('Endereço salvo com sucesso!', 'success');
        addressForm.reset();
        addressForm.classList.add('hidden');
        loadAddresses();
    } catch (error) {
        console.error("Erro ao salvar endereço:", error);
        showModalMessage('Erro ao salvar endereço.', 'error');
    }
});

// Excluir endereço
async function handleDeleteAddress(id) {
    if (!currentUser || !confirm("Tem certeza que deseja excluir este endereço?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "addresses", id));
        showModalMessage('Endereço excluído.', 'success');
        loadAddresses();
    } catch (error) {
        console.error("Erro ao excluir endereço:", error);
        showModalMessage('Erro ao excluir endereço.', 'error');
    }
}

// Preparar formulário para edição de endereço
async function handleEditAddress(id) {
    const docRef = doc(db, "users", currentUser.uid, "addresses", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const address = docSnap.data();
        document.getElementById('address-id').value = id;
        document.getElementById('address-street').value = address.street;
        document.getElementById('address-city').value = address.city;
        document.getElementById('address-state').value = address.state;
        document.getElementById('address-zip').value = address.zip;
        addressForm.classList.remove('hidden');
    }
}


// Atualizar detalhes da conta (Nome, Email, Senha)
accountDetailsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('display-name').value;
    const newEmail = document.getElementById('user-email').value;
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;

    const promises = [];

    // Atualizar nome
    if (newName && newName !== currentUser.displayName) {
        promises.push(updateProfile(currentUser, { displayName: newName }));
    }

    // Atualizar email
    if (newEmail && newEmail !== currentUser.email) {
        promises.push(updateEmail(currentUser, newEmail));
    }
    
    // Se não houver outras alterações e os campos de senha estiverem vazios, não faz nada.
    if (promises.length === 0 && !currentPassword && !newPassword) {
        showModalMessage("Nenhuma alteração para salvar.", "success");
        return;
    }

    try {
        // Executa as promessas de atualização de nome e email primeiro
        if (promises.length > 0) {
            await Promise.all(promises);
            showModalMessage("Nome/Email atualizados com sucesso!", "success");
        }

        // Lógica para atualizar a senha
        if (currentPassword && newPassword) {
            if (newPassword.length < 6) {
                showModalMessage("A nova senha deve ter no mínimo 6 caracteres.", "error");
                return;
            }

            // Reautenticar o usuário antes de mudar a senha
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            // Se a reautenticação for bem-sucedida, atualiza a senha
            await updatePassword(currentUser, newPassword);
            
            showModalMessage("Senha alterada com sucesso!", "success");

        } else if (currentPassword || newPassword) {
            // Se apenas um dos campos de senha for preenchido
            showModalMessage("Para alterar a senha, você deve preencher os campos de senha atual e nova senha.", "error");
            return;
        }

        // Limpa os campos de senha após o sucesso
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';

    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        let errorMessage = "Ocorreu um erro ao salvar as alterações.";
        if (error.code === 'auth/wrong-password') {
            errorMessage = "A senha atual está incorreta. Tente novamente.";
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = "Esta operação é sensível e exige um login recente. Por favor, saia e entre novamente na sua conta.";
        }
        showModalMessage(errorMessage, "error");
    }
});


// --- EVENT LISTENERS GERAIS ---
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    });
});

openModalBtn.addEventListener('click', () => {
    if (currentUser) {
        // Preenche os dados atuais do usuário no formulário
        displayNameInput.value = currentUser.displayName || '';
        userEmailInput.value = currentUser.email || '';
        loadAddresses(); // Carrega os endereços
    }
    accountModal.classList.add('visible');
});

closeModalBtn.addEventListener('click', () => {
    accountModal.classList.remove('visible');
});

// Botão para mostrar o formulário de novo endereço
addNewAddressBtn.addEventListener('click', () => {
    addressForm.reset();
    document.getElementById('address-id').value = '';
    addressForm.classList.remove('hidden');
});

// Botão para cancelar a edição de endereço
cancelAddressEditBtn.addEventListener('click', () => {
    addressForm.reset();
    addressForm.classList.add('hidden');
});


// --- LÓGICA PRINCIPAL DA PÁGINA ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    accountDetailsP.textContent = currentUser.displayName || currentUser.email;

    const q = query(collection(db, "orders"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      orderBox.textContent = "Você ainda não fez nenhum pedido.";
    } else {
      orderBox.innerHTML = "";
      querySnapshot.forEach((doc) => {
        const order = doc.data();
        const orderDate = order.createdAt?.toDate().toLocaleDateString('pt-BR') || 'Data indisponível';
        const orderCard = document.createElement("div");
        orderCard.className = 'order-card';
        let itemsHTML = order.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');

        orderCard.innerHTML = `
          <div class="order-header">
            <span class="order-id">PEDIDO #${doc.id.substring(0, 6).toUpperCase()}</span>
            <span class="order-status">${order.status}</span>
          </div>
          <div class="order-body">
            <p><strong>Data:</strong> ${orderDate}</p>
            <p><strong>Total:</strong> R$ ${order.total.toFixed(2).replace('.', ',')}</p>
            <ul>${itemsHTML}</ul>
          </div>
        `;
        orderBox.appendChild(orderCard);
      });
    }
  } else {
    window.location.href = "login.html";
  }
});