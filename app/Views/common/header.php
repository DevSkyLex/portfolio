<header>
    <!-- Barre des contacts -->
    <div class="contact_bar">
        <menu class="media-menu">
            <!-- Téléphone -->
            <li class="media-item">
                <a class="media-link" href="tel:" id="phone"><i class="uil uil-phone"></i></a>
            </li>

            <!-- Github -->
            <li class="media-item">
                <a target="_blank" class="media-link" href="https://github.com/DevSkyLex" id="github"><i class="uil uil-github"></i></a>
            </li>

            <!-- Linkedin -->
            <li class="media-item">
                <a target="_blank" class="media-link" href="https://www.linkedin.com/in/valentin-fortin/" id="linkedin"><i class="uil uil-linkedin"></i></a>
            </li>
        </menu>

        <a class="media-link" id="email" href="mailto:contact@valentin-fortin.pro"><i class="uil uil-envelope-alt"></i><span>contact@valentin-fortin.pro</span></a>
    </div>

    <!-- Navigation du site -->
    <div class="navigation_bar">
        <div class="brand">
            <span id="name"><?= FIRSTNAME." ".LASTNAME; ?></span>
        </div>

        <!-- Icon menu de navigation -->
        <button id="navMobile-btn" onclick="toggleNavMenu(this);" class="nav-mobile-btn">
            <i data-icon="true" class="uil uil-bars"></i>
            <i data-icon="false" class="uil uil-times"></i>
        </button>

        <nav class="nav">
            <!-- Menu de navigation : bureau -->
            <menu class="nav-menu">
                <!-- Accueil -->
                <li class="nav-item">
                    <a href="<?= base_url("/public"); ?>" class="nav-link" id="home">Accueil</a>
                </li>

                <!-- Compétences -->
                <li class="nav-item">
                    <a href="<?= base_url("#skills"); ?>" class="nav-link" id="skills">Compétences</a>
                </li>

                <!-- Projets -->
                <li class="nav-item">
                    <a href="<?= base_url("#projects"); ?>" class="nav-link" id="projects">Projets</a>
                </li>

                <!-- Contact -->
                <li class="nav-item">
                    <a href="<?= base_url("#contact"); ?>" class="nav-link" id="contact">Contact</a>
                </li>
            </menu>
        </nav>
    </div>

    <!-- Menu de navigation : mobile -->
    <nav class="nav-mobile" data-nav="false" id="navMobile-menu">
        <!-- Menu de navigation -->
        <menu class="nav-menu">
            <!-- Accueil -->
            <li class="nav-item">
                <a href="<?= base_url("/public"); ?>" class="nav-link" id="home"><i class="icon uil uil-estate"></i> Accueil</a>
            </li>

            <!-- Compétences -->
            <li class="nav-item">
                <a href="<?= base_url("#skills"); ?>" class="nav-link" id="skills"><i class="icon uil uil-brackets-curly"></i>Compétences</a>
            </li>

            <!-- Projets -->
            <li class="nav-item">
                <a href="<?= base_url("#projects"); ?>" class="nav-link" id="projects"><i class="icon uil uil-folder-check"></i>Projets</a>
            </li>

            <!-- Contact -->
            <li class="nav-item">
                <a href="<?= base_url("#contact"); ?>" class="nav-link" id="contact"><i class="icon uil uil-clipboard"></i>Contact</a>
            </li>
        </menu>
    </nav>
</header>