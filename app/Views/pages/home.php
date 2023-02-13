<main>
    <!-- Hero -->
    <section class="container" id="hero">

    </section>

    <!-- Stats -->
    <section class="container" id="stats">
        <!-- Groupe de boîtes -->
        <div class="box_group">
            <!-- Boîte à icône -->
            <div class="box_icon reveal fade-bottom">
                <!-- Icon -->
                <span class="icon"><i class="uil uil-folder-check"></i></span>

                <!-- Informations -->
                <div class="content">
                    <span class="number"><span class="animate-value"><?= count(session()->getFlashdata('projects')); ?></span></span>
                    <span class="label">Projets réalisés</span>
                </div>
            </div>

            <!-- Boîte à icône -->
            <div class="box_icon reveal fade-bottom">
                <!-- Icon -->
                <span class="icon"><i class="uil uil-user-circle"></i></span>

                <!-- Informations -->
                <div class="content">
                    <span class="number"><span class="animate-value">20</span></span>
                    <span class="label">Age</span>
                </div>
            </div>

            <!-- Boîte à icône -->
            <div class="box_icon reveal fade-bottom">
                <!-- Icon -->
                <span class="icon"><i class="uil uil-graduation-cap"></i></span>

                <!-- Informations -->
                <div class="content">
                    <span class="number">+<span class="animate-value"><?= BAC_LEVEL; ?></span></span>
                    <span class="label">Niveau bac</span>
                </div>
            </div>

            <!-- Boîte à icône -->
            <div class="box_icon reveal fade-bottom">
                <!-- Icon -->
                <span class="icon"><i class="uil uil-code-branch"></i></span>

                <!-- Informations -->
                <div class="content">
                    <span class="number"><span class="animate-value">15</span></span>
                    <span class="label">Dépôts Github</span>
                </div>
            </div>
        </div>
    </section>

    <section class="container reveal fade-bottom" id="career">
        <!-- Informations de la section : career -->
        <div class="section-infos">
            <h2>Parcours</h2>
        </div>

        <!-- Boîtes de parcours -->
        <div class="box_group">
            <div class="box_career_wrapper reveal fade-bottom">
                <span class="title">Formations</span>

                <div class="box_career reveal fade-bottom">
                    <div class="timeline">
                        <span class="icon"><i class="uil uil-graduation-cap"></i></span>
                        <span class="line"></span>
                    </div>
                    <div class="content">
                        <span class="time">Septembre 2021 - Actuellement</span>
                        <h3>BTS SIO spécialité SLAM (Solutions Logicielles et Applications Métiers)</h3>
                        <p>Obtention des compétences nécessaire à l'obtention du BTS SIO en spécialité SLAM : compétences dans le développement de solutions informatique, la mise
                            en place de sites Internet et de clients lourds.
                        </p>
                    </div>
                </div>

                <div class="box_career reveal fade-bottom">
                    <div class="timeline">
                        <span class="icon"><i class="uil uil-graduation-cap"></i></span>
                        <span class="line"></span>
                    </div>
                    <div class="content">
                        <span class="time">Juillet 2021</span>
                        <h3>Baccalauréat STI2D</h3>
                        <p>Obtention du baccalauréat Sciences et Technologie de l'Industrie et du Développement Durable en spécialité SIN.</p>
                    </div>
                </div>

                <div class="box_career reveal fade-bottom">
                    <div class="timeline">
                        <span class="icon"><i class="uil uil-graduation-cap"></i></span>
                        <span class="line"></span>
                    </div>
                    <div class="content">
                        <span class="time">Juillet 2021</span>
                        <h3>Baccalauréat STI2D</h3>
                        <p>Obtention du baccalauréat Sciences et Technologie de l'Industrie et du Développement Durable en spécialité SIN.</p>
                    </div>
                </div>
            </div>

            <div class="box_career_wrapper reveal fade-bottom">
                <span class="title">Expériences professionnels</span>

                <div class="box_career reveal fade-bottom">
                    <div class="timeline">
                        <span class="icon"><i class="uil uil-bag"></i></span>
                        <span class="line"></span>
                    </div>
                    <div class="content">
                        <span class="time">Mars 2023 - Avril 2023</span>
                        <h3>Stage - Kodoka</h3>
                        <p>
                            Stage de 2ème année de BTS SIO : développement d'un CRM (interface de relations clients) pour l'entreprise Kodoka.
                        </p>
                    </div>
                </div>

                <div class="box_career reveal fade-bottom">
                    <div class="timeline">
                        <span class="icon"><i class="uil uil-bag"></i></span>
                        <span class="line"></span>
                    </div>
                    <div class="content">
                        <span class="time">Mai 2022 - Juin 2022</span>
                        <h3>Stage - Utopia Consulting</h3>
                        <p>Stage de 1ère année de BTS SIO : apprentissage des outils de 
                        l'entreprise en matière de conception web (Wordpress, Elementor) et création et implémentation d'un thème aux couleurs de la charte graphique d'Utopia Consulting pour Wordpress.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Projets -->
    <section class="container reveal fade-bottom" id="projects">
        <!-- Informations de la section : projets -->
        <div class="section-infos">
            <h2>Projets</h2>
        </div>

        <!-- Cartes des projets -->
        <div class="cards_group">
            <?php foreach(session()->getFlashdata('projects') as $project): ?>
                <!-- Carte -->
                <div class="card">
                    <!-- Corps de la carte -->
                    <div class="card_body">
                        <!-- En-tête de la carte -->
                        <div class="card_header">
                            <!-- Titres -->
                            <div class="card_titles">
                                <span class="subtitle"><?= $project->getCategory()->getLabel(); ?></span>
                                <h3><?= $project->getTitle(); ?></h3>
                            </div>
                        </div>

                        <!-- Description -->
                        <p><?= $project->getDescription(); ?></p>

                        <!-- Compétences -->
                        <div class="tag_group">
                            <?php foreach($project->getSkills() as $skill): ?>
                                <span class="tag"><?= $skill->getName(); ?></span>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </section>
</main>