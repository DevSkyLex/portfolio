<main>
    <?php foreach(session()->getFlashdata('projects') as $project): ?>
        <!-- Carte -->
        <div class="card" style="width: 500px;">
            <img src="https://hosting.zaonce.net/elite-dangerous/galnet/NewsImageShipyardImperial.png" alt="" class="card-img-top">

            <!-- Corps de la carte -->
            <div class="card_body">
                <!-- En-tête de la carte -->
                <div class="card_header">
                    <div class="card_titles">
                        <span class="subtitle">Projet scolaire</span>
                        <h3><?= $project->getTitle(); ?></h3>
                    </div>
                </div>

                <p><?= $project->getDescription(); ?></p>

                <div class="tag_group">
                    <?php foreach($project->getSkills() as $skill): ?>
                        <span class="tag"><?= $skill->getName(); ?></span>
                    <?php endforeach; ?>
                </div>

                <!-- Pied de la carte -->
                <div class="card_footer">
                    <div class="btn_group">
                        <a href="" class="btn btn-medium btn-primary">Je m'abonne</a>
                        <a href="" class="btn btn-medium btn-secondary">Détails</a>
                    </div>
                </div>
            </div>
        </div>
    <?php endforeach; ?>
</main>