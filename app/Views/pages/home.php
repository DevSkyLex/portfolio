<main>
    <section class="section_container" id="hero">

    </section>

    <section class="section_container" id="project">
        <div class="cards_group">
            <?php foreach(session()->getFlashdata('projects') as $project): ?>
                <!-- Carte -->
                <div class="card">
                    <!-- Corps de la carte -->
                    <div class="card_body">
                        <!-- En-tête de la carte -->
                        <div class="card_header">
                            <div class="card_titles">
                                <span class="subtitle">Projet <?= $project->getCategory(); ?></span>
                                <h3><?= $project->getTitle(); ?></h3>
                            </div>
                        </div>

                        <p><?= $project->getDescription(); ?></p>

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