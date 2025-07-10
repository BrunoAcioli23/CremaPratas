import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
    import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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

    const logoutBtn = document.querySelector(".logout-btn");
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "login.html";
    });

    const orderBox = document.querySelector(".box .empty-box");
    const accountDetails = document.querySelector(".account-details p strong");

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        accountDetails.textContent = user.displayName || user.email;

        const q = query(collection(db, "pedidos"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          orderBox.textContent = "Você ainda não fez nenhum pedido.";
        } else {
          orderBox.innerHTML = "";
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const item = document.createElement("div");
            item.textContent = `Pedido #${doc.id} - ${data.status || 'Em processamento'}`;
            orderBox.appendChild(item);
          });
        }
      } else {
        window.location.href = "login.html";
      }
    });