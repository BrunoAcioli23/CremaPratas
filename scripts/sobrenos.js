// Lógica do Header Responsivo
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const mainNav = document.getElementById('main-nav');
        const categoriesBtn = document.getElementById('categories-btn');
        const megaMenu = document.getElementById('mega-menu');

        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mainNav.classList.toggle('active');
        });

        categoriesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            megaMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                mainNav.classList.remove('active');
            }
            if (!megaMenu.contains(e.target) && !categoriesBtn.contains(e.target)) {
                megaMenu.classList.remove('active');
            }
        });