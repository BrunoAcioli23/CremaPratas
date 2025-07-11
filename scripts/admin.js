import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

        import { getFirestore, doc, getDoc, collection, getDocs, addDoc, deleteDoc, writeBatch, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

        import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAOJYhteeQkDf90pNc-Q26TWC4dpRcWGnw",
            authDomain: "cremapratas-e70b9.firebaseapp.com",
            projectId: "cremapratas-e70b9",
            storageBucket: "cremapratas-e70b9.firebasestorage.app",
            messagingSenderId: "601950880055",
            appId: "1:601950880055:web:9660320d933ec2468adab2",
            measurementId: "G-V31HKENBBY"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);

        const loginSection = document.getElementById('login-section');
        const adminPanel = document.getElementById('admin-panel');
        const loginForm = document.getElementById('login-form');
        const productForm = document.getElementById('product-form');
        const logoutBtn = document.getElementById('logout-btn');
        const messageArea = document.getElementById('message-area');
        const submitBtn = document.getElementById('submit-btn');

        const ordersPanel = document.getElementById('orders-panel');
        const ordersTableBody = document.getElementById('orders-table-body');
        const dashboard = document.getElementById('dashboard');
        const totalOrdersEl = document.getElementById('total-orders');
        const totalSalesEl = document.getElementById('total-sales');
        const totalProductsEl = document.getElementById('total-products');
        const totalOutOfStockEl = document.getElementById('total-outofstock');
        const adminTabs = document.getElementById('admin-tabs');


        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                    loginSection.classList.add('hidden');
                    adminPanel.classList.remove('hidden');
                    ordersPanel.classList.remove('hidden');
                    dashboard.classList.remove('hidden');
                    adminTabs.classList.remove('hidden');
                    showTab('dashboard');

                    loadOrders();
                    loadProducts();
                    loadDashboard();
                } else {
                    loginSection.classList.add('hidden');
                    adminPanel.classList.add('hidden');
                    showMessage('Acesso negado. Você não é um administrador.', 'error');
                    await signOut(auth);
                }
            } else {
                loginSection.classList.remove('hidden');
                adminPanel.classList.add('hidden');
            }
        });

        const productsTableBody = document.getElementById('products-table-body');

        async function loadProducts() {
            productsTableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
            try {
                const snapshot = await getDocs(collection(db, "products"));
                productsTableBody.innerHTML = '';

                snapshot.forEach(docSnap => {
                    const product = docSnap.data();
                    const id = docSnap.id;

                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #444';

                    row.innerHTML = `
                        <td><img src="${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                        <td>${product.name}</td>
                        <td>R$ ${product.price.toFixed(2).replace('.', ',')}</td>
                        <td>${product.stock || 0}</td>
                        <td>
                            <button class="btn btn-primary edit-btn">Editar</button>
                            <button class="btn btn-danger delete-btn">Excluir</button>
                        </td>
                    `;

                    // Adiciona os botões
                    const editBtn = row.querySelector('.edit-btn');
                    const deleteBtn = row.querySelector('.delete-btn');

                    editBtn.addEventListener('click', () => editProduct(id));
                    deleteBtn.addEventListener('click', () => deleteProduct(id, product.image));

                    productsTableBody.appendChild(row);
                });

            } catch (err) {
                console.error("Erro ao carregar produtos:", err);
                productsTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar produtos.</td></tr>';
            }
        }


        async function deleteProduct(productId, imageUrl) {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;

        try {
            await deleteDoc(doc(db, "products", productId));

            if (imageUrl) {
                const imageRef = ref(storage, imageUrl.replace(`https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/`, '').split('?')[0]);
                await imageRef.delete?.(); // se for uma referência Firebase
            }

            showMessage("Produto excluído com sucesso.", "success");
            loadProducts();
            loadDashboard(); // atualiza contagem

        } catch (error) {
            console.error("Erro ao excluir produto:", error);
            showMessage("Erro ao excluir produto.", "error");
        }
    }


        async function loadOrders() {
            ordersTableBody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';

            try {
                const querySnapshot = await getDocs(collection(db, "orders"));
                const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                ordersTableBody.innerHTML = '';

                orders.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

                orders.forEach(order => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid #333';

                    const date = order.createdAt?.toDate().toLocaleString() || '—';
                    const items = order.items.map(i => `${i.name} (${i.quantity}x)`).join('<br>');
                    const total = `R$ ${order.total.toFixed(2).replace('.', ',')}`;
                    const status = order.status;

                    row.innerHTML = `
                        <td>${date}</td>
                        <td>${items}</td>
                        <td>${total}</td>
                        <td style="text-transform: capitalize;">${status}</td>
                        <td>
                        ${status === 'aberto' ? `
                            <button data-id="${order.id}" class="finalize-btn btn btn-primary">Finalizar</button>
                            <button data-id="${order.id}" class="edit-order-btn btn btn-secondary">Editar</button>
                        ` : ''}
                        <button data-id="${order.id}" class="delete-btn btn btn-danger">Excluir</button>
                        <button data-id="${order.id}" class="cancel-btn btn btn-danger">Cancelar</button>
                        </td>
                    `;

                    ordersTableBody.appendChild(row);
                });

                addOrderListeners();

            } catch (error) {
                console.error("Erro ao carregar pedidos:", error);
                ordersTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar pedidos</td></tr>';
            }
        }

        function addOrderListeners() {
            document.querySelectorAll('.finalize-btn').forEach(btn => {
                btn.addEventListener('click', () => finalizeOrder(btn.dataset.id));
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteOrder(btn.dataset.id));
            });

            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', () => cancelarPedido(btn.dataset.id));
            });

            document.querySelectorAll('.edit-order-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditOrderModal(btn.dataset.id));
            });
        }

        async function openEditOrderModal(orderId) {
            console.log("Abrindo modal para pedido:", orderId); // debug
            const modal = document.getElementById("edit-order-modal");
            const itemsContainer = document.getElementById("edit-order-items");
            const totalInput = document.getElementById("edit-order-total");

            try {
                const orderRef = doc(db, "orders", orderId);
                const orderSnap = await getDoc(orderRef);
                if (!orderSnap.exists()) {
                    showMessage("Pedido não encontrado.", "error");
                    return;
                }

                const order = orderSnap.data();
                modal.classList.remove("hidden");
                modal.dataset.orderId = orderId;
                totalInput.value = order.total?.toFixed(2) || 0;

                itemsContainer.innerHTML = '';
                order.items.forEach((item, index) => {
                    const itemRow = document.createElement('div');
                    itemRow.style.marginBottom = '10px';
                    itemRow.innerHTML = `
                        <label>${item.name}</label>
                        <input type="number" min="0" step="1" value="${item.quantity}" data-index="${index}" class="edit-order-quantity">
                    `;
                    itemsContainer.appendChild(itemRow);
                });

            } catch (err) {
                console.error("Erro ao abrir modal de edição:", err);
                showMessage("Erro ao carregar pedido.", "error");
            }
        }

        let currentEditingOrderId = null;

        document.getElementById("save-edit-order").addEventListener("click", async () => {
            const modal = document.getElementById("edit-order-modal");
            const orderId = modal.dataset.orderId;
            const newTotal = parseFloat(document.getElementById("edit-order-total").value);
            const quantityInputs = document.querySelectorAll(".edit-order-quantity");

            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            if (!orderSnap.exists()) return;

            const order = orderSnap.data();
            const updatedItems = order.items.map((item, i) => {
                const newQty = parseInt(quantityInputs[i].value);
                return { ...item, quantity: newQty };
            });

            try {
                await updateDoc(orderRef, {
                    total: newTotal,
                    items: updatedItems
                });
                showMessage("Pedido atualizado com sucesso!", "success");
                modal.classList.add("hidden");
                loadOrders();
            } catch (err) {
                console.error("Erro ao salvar pedido:", err);
                showMessage("Erro ao atualizar pedido.", "error");
            }
        });

        document.getElementById("cancel-edit-order").addEventListener("click", () => {
            document.getElementById("edit-order-modal").classList.add("hidden");
        });


        async function cancelarPedido(orderId) {
            try {
                await updateDoc(doc(db, 'orders', orderId), { status: 'cancelado' });
                showMessage('Pedido cancelado.', 'success');
                loadOrders();
            } catch (err) {
                console.error('Erro ao cancelar pedido:', err);
                showMessage('Erro ao cancelar pedido.', 'error');
            }
        }


        async function finalizeOrder(orderId) {
            const orderRef = doc(db, "orders", orderId);
            const orderSnap = await getDoc(orderRef);
            if (!orderSnap.exists()) return;

            const order = orderSnap.data();
            const batch = writeBatch(db);

            for (const item of order.items) {
                const productRef = doc(db, "products", item.productId);
                const productSnap = await getDoc(productRef);

                if (productSnap.exists()) {
                    const data = productSnap.data();
                    const newStock = Math.max((data.stock || 0) - item.quantity, 0);
                    const newSold = (data.sold || 0) + item.quantity;

                    batch.update(productRef, { stock: newStock, sold: newSold });
                }
            }

            batch.update(orderRef, { status: "finalizado" });

            try {
                await batch.commit();
                showMessage('Pedido finalizado com sucesso!', 'success');
                loadOrders();
                loadProducts();
                loadDashboard();
            } catch (err) {
                console.error("Erro ao finalizar pedido:", err);
                showMessage('Erro ao finalizar pedido.', 'error');
            }
        }

        async function deleteOrder(orderId) {
            try {
                await deleteDoc(doc(db, "orders", orderId));
                showMessage('Pedido excluído com sucesso.', 'success');
                loadOrders();
                loadProducts();
                loadDashboard();
            } catch (error) {
                console.error("Erro ao excluir pedido:", error);
                showMessage('Erro ao excluir pedido.', 'error');
            }
        }

        async function loadDashboard() {
            try {
                const ordersSnapshot = await getDocs(collection(db, "orders"));
                const orders = ordersSnapshot.docs.map(doc => doc.data());

                const finalizedOrders = orders.filter(o => o.status === "finalizado");
                const totalSales = finalizedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

                // Filtro padrão: todos os pedidos finalizados
                const salesByDate = {};

                finalizedOrders.forEach(order => {
                    if (!order.createdAt || !order.total) return;
                    const date = order.createdAt.toDate().toLocaleDateString();
                    salesByDate[date] = (salesByDate[date] || 0) + order.total;
                });

                const dates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));
                const totals = dates.map(date => salesByDate[date]);

                const ctx = document.getElementById('sales-chart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Total Vendido (R$)',
                            data: totals,
                            fill: false,
                            borderColor: '#f28e2c',
                            backgroundColor: '#f28e2c',
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: (value) => `R$ ${value.toFixed(2).replace('.', ',')}`
                                }
                            }
                        }
                    }
                });

                totalOrdersEl.textContent = orders.length;
                totalSalesEl.textContent = `R$ ${totalSales.toFixed(2).replace('.', ',')}`;

                const productsSnapshot = await getDocs(collection(db, "products"));
                const products = productsSnapshot.docs.map(doc => doc.data());

                totalProductsEl.textContent = products.length;
                totalOutOfStockEl.textContent = products.filter(p => (p.stock || 0) === 0).length;

                const totalStockValue = products.reduce((sum, p) => {
                    const stock = p.stock || 0;
                    const cost = p.cost || 0;
                    return sum + (stock * cost);
                }, 0);

                document.getElementById("total-stock-value").textContent = `R$ ${totalStockValue.toFixed(2).replace('.', ',')}`;

                // Total potencial de vendas (valor de venda * estoque)
                const totalPotentialSales = products.reduce((sum, p) => {
                    const stock = p.stock || 0;
                    const price = p.price || 0;
                    return sum + (stock * price);
                }, 0);
                document.getElementById("total-stock-sales").textContent = `R$ ${totalPotentialSales.toFixed(2).replace('.', ',')}`;

                // Lucro potencial (valor de venda - custo)
                const totalProfit = totalPotentialSales - totalStockValue;
                document.getElementById("total-stock-profit").textContent = `R$ ${totalProfit.toFixed(2).replace('.', ',')}`;


                totalProductsEl.textContent = products.length;
                totalOutOfStockEl.textContent = products.filter(p => (p.stock || 0) === 0).length;

                const categoryCounts = {};
                products.forEach(p => {
                    const cat = p.category || 'Indefinido';
                    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                });

                const categoryChart = new Chart(document.getElementById('category-chart').getContext('2d'), {
                    type: 'pie',
                    data: {
                        labels: Object.keys(categoryCounts),
                        datasets: [{
                            data: Object.values(categoryCounts),
                            backgroundColor: [
                                '#4e79a7', '#f28e2c', '#e15759',
                                '#76b7b2', '#59a14f', '#edc949'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });


            } catch (err) {
                console.error("Erro ao carregar dashboard:", err);
                showMessage('Erro ao carregar resumo.', 'error');
            }

            document.getElementById("total-stock-value").textContent = `R$ ${totalStockValue.toFixed(2).replace('.', ',')}`;

        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Erro no login:", error);
                showMessage(`Erro no login: ${error.message}`, 'error');
            }
        });

        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showMessage('Você saiu da sua conta.', 'success');
            } catch (error) {
                console.error("Erro ao sair:", error);
                showMessage(`Erro ao sair: ${error.message}`, 'error');
            }
        });

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (editingProductId) {
                // Atualizar produto existente
                try {
                    const cost = parseFloat(document.getElementById("product-cost").value);
                    const updatedData = {
                        name: document.getElementById("product-name").value,
                        cost: parseFloat(document.getElementById("product-cost").value), // 👈 ADICIONE ESTA LINHA
                        price: parseFloat(document.getElementById("product-price").value),
                        oldPrice: parseFloat(document.getElementById("product-old-price").value) || 0,
                        stock: parseInt(document.getElementById("product-stock").value),
                        category: document.getElementById("product-category").value,
                        isSelected: document.getElementById("product-is-selected").checked,
                        terms: Array.from(document.querySelectorAll('input[name="terms"]:checked')).map(el => el.value),
                    };
                
                const productRef = doc(db, "products", editingProductId);
                await updateDoc(productRef, updatedData);

                showMessage("Produto atualizado com sucesso!", "success");
                productForm.reset();
                editingProductId = null;
                submitBtn.textContent = "Cadastrar Produto";
                loadProducts();
                loadDashboard();
            } catch (error) {
                console.error("Erro ao atualizar produto:", error);
                showMessage("Erro ao atualizar produto.", "error");
            }
            submitBtn.disabled = false;
            return;
        }
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const name = document.getElementById('product-name').value;
            const cost = parseFloat(document.getElementById("product-cost").value);
            const price = parseFloat(document.getElementById('product-price').value);
            const oldPrice = parseFloat(document.getElementById('product-old-price').value) || 0;
            const imageFile = document.getElementById('product-image').files[0];
            const collectionName = 'products';
            const category = document.getElementById('product-category').value;
            const isSelected = document.getElementById('product-is-selected').checked;
            const stock = parseInt(document.getElementById('product-stock').value);
            if (isNaN(stock) || stock < 0) {
                showMessage('Por favor, insira uma quantidade válida em estoque.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cadastrar Produto';
                return;
            }
            const terms = Array.from(document.querySelectorAll('input[name="terms"]:checked')).map(el => el.value);

            if (!imageFile || !category) {
                showMessage('Por favor, preencha todos os campos obrigatórios, incluindo a categoria e a imagem.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cadastrar Produto';
                return;
            }

            try {
                showMessage('Fazendo upload da imagem...', 'success');
                const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
                await uploadBytes(storageRef, imageFile);
                const imageUrl = await getDownloadURL(storageRef);

                showMessage('Imagem enviada! Salvando produto...', 'success');

                const productData = {
                    name,
                    cost, // <-- Aqui, cost está indefinido!
                    price,
                    oldPrice,
                    image: imageUrl,
                    category,
                    isSelected,
                    terms,
                    createdAt: serverTimestamp(),
                    stock
                };

                await addDoc(collection(db, collectionName), productData);

                showMessage('Produto cadastrado com sucesso!', 'success');
                productForm.reset();

            } catch (error) {
                console.error("Erro ao cadastrar produto:", error);
                showMessage(`Erro: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cadastrar Produto';
            }
        });

        function showMessage(msg, type) {
            messageArea.textContent = msg;
            messageArea.className = type;
            messageArea.classList.remove('hidden');
            setTimeout(() => {
                messageArea.classList.add('hidden');
            }, 4000);
        }

        // Abas do painel
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabSections = {
            dashboard: document.getElementById('dashboard'),
            'admin-panel': document.getElementById('admin-panel'),
            'orders-panel': document.getElementById('orders-panel'),
            'products-panel': document.getElementById('products-panel'),

        };

        function showTab(tab) {
            Object.keys(tabSections).forEach(id => {
                if (id === tab) {
                    tabSections[id].classList.remove('hidden');
                } else {
                    tabSections[id].classList.add('hidden');
                }
            });

            tabButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });
        }

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => showTab(btn.dataset.tab));
        });

        let editingProductId = null;

        async function editProduct(productId) {
            try {
                const productRef = doc(db, "products", productId);
                const productSnap = await getDoc(productRef);

                if (!productSnap.exists()) {
                    showMessage("Produto não encontrado.", "error");
                    return;
                }

                const data = productSnap.data();
                editingProductId = productId;

                // 👇 ESSA LINHA AQUI
                document.getElementById("admin-panel").classList.remove("hidden");
                showTab('admin-panel');

                // Preenche o formulário com os dados do produto
                document.getElementById("product-name").value = data.name || "";
                document.getElementById("product-cost").value = data.cost || 0;
                document.getElementById("product-price").value = data.price || 0;
                document.getElementById("product-old-price").value = data.oldPrice || 0;
                document.getElementById("product-stock").value = data.stock || 0;
                document.getElementById("product-category").value = data.category || "";
                document.getElementById("product-is-selected").checked = data.isSelected || false;

                // Termos
                document.querySelectorAll('input[name="terms"]').forEach(input => {
                    input.checked = data.terms?.includes(input.value) || false;
                });

                // Ocultar campo de imagem (não será substituída aqui)
                document.getElementById("product-image").required = false;

                
                submitBtn.textContent = "Salvar Alterações";
            } catch (err) {
                console.error("Erro ao carregar produto:", err);
                showMessage("Erro ao carregar produto.", "error");
            }
        }
