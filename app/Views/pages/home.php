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
        <div class="section-infos center">
            <h2>Parcours<span class="bg-text">Formations</span></h2>
            <hr>
            <p>

            </p>
        </div>

        <!-- Boîtes de parcours -->
        <div class="box_group">
            <div class="box_career_wrapper reveal fade-left">
                <span class="title">Formations</span>

                <div class="box_career reveal fade-left">
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

                <div class="box_career reveal fade-left">
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

            <div class="box_career_wrapper reveal fade-right">
                <span class="title">Expériences professionnels</span>

                <div class="box_career reveal fade-right">
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

                <div class="box_career reveal fade-right">
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
    <section class="container reveal fade-bottom decoration deco-square deco-medium" id="projects">
        <!-- Informations de la section : projets -->
        <div class="section-infos center">
            <h2>Projets<span class="bg-text">Portfolio</span></h2>
            <hr>
            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Est molestias modi nisi. Deleniti incidunt dignissimos rem. Ducimus laboriosam aut perferendis, laudantium, ea nesciunt, impedit molestiae quos placeat odio ipsa aliquam.</p>
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
                                <h3 class="title"><?= $project->getTitle(); ?></h3>
                            </div>
                        </div>

                        <!-- Description -->
                        <p><?= $project->getDescription(); ?></p>

                        <a href="">En savoir plus</a>

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

    <section class="container" id="contact">
        <div class="wrapper">
            <span class="subtitle">Formulaire</span>
            <h2>Contact</h2>
            <p>
                Des questions, des suggestions ? Vous pouvez me contacter via ce formulaire, ou directement par mes réseaux ou par email.
            </p>

            <ul class="links_bar medias">
                <li class="medias-items">
                    <a href="https://github.com/DevSkyLex" target="_blank" rel="noopener noreferrer"><i class="uil uil-github"></i></a>
                </li>

                <li class="medias-items">
                    <a href="https://www.linkedin.com/in/valentin-fortin/" target="_blank" rel="noopener noreferrer"><i class="uil uil-linkedin"></i></a>
                </li>

                <li class="medias-items">
                    <a href="mailto:contact@valentin-fortin.pro"><i class="uil uil-at"></i></a>
                </li>

                <li class="medias-items">
                    <a href="tel:0755613231"><i class="uil uil-phone"></i></a>
                </li>
            </ul>
        </div>

        <div class="wrapper">
            <?= form_open("/submit"); ?>
                <div class="input_group">
                    <!-- Prénom -->
                    <div class="input-field">
                        <label class="required" for="firstname">Prénom</label>
                        <input placeholder="Votre prénom" value="<?= set_value('firstname'); ?>" id="firstname" name="firstname" type="text">
                    </div>

                    <!-- Nom -->
                    <div class="input-field">
                        <label class="required" for="lastname">Nom</label>
                        <input placeholder="Votre nom" value="<?= set_value('lastname'); ?>" id="lastname" name="lastname" type="text">
                    </div>
                </div>

                <div class="input_group">
                    <!-- Adresse email -->
                    <div class="input-field">
                        <label class="required" for="email">Adresse email</label>
                        <input placeholder="Votre adresse email" value="<?= set_value('email'); ?>" id="email" name="email" type="email">
                    </div>
                </div>

                <div class="input_group">
                    <!-- Adresse email -->
                    <div class="input-field">
                        <label class="required" for="message">Message</label>
                        <textarea placeholder="Votre message" value="<?= set_value('message'); ?>" rows="6" id="message" name="message"></textarea>
                    </div>
                </div>

                <div class="input_group">
                    <div class="input-field inline">
                        <input type="checkbox" name="accept-tos" id="accept-tos">
                        <label class="for-checkbox required" for="accept-tos">J'accepte les conditions générales d'utilisation.</label>
                    </div>
                </div>

                <div class="btn_group">
                    <button type="submit" class="btn btn-medium btn-primary">Envoyer</button>
                </div>
            <?= form_close(); ?>
        </div>
    </section>
</main>