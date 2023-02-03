<?php

use App\Libraries\Project\Project;
use App\Libraries\Project\Skill;
use CodeIgniter\Test\CIUnitTestCase;

/**
 * Classe ProjectTest
 * @package App\Tests
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
final class ProjectTest extends CIUnitTestCase
{
    #region Propriété.s
    /**
     * Projet à tester
     * @var Project
     */
    protected Project $project;

    /**
     * Compétences à ajouter au projet
     * @var array
     */
    protected array $skills;
    #endregion

    /**
     * Instanciation des objets utiles aux tests
     * @return void
     */
    public function setUp(): void
    {
        // Instanciation des compétences
        $this->skills = array(
            "JavaScript" => new Skill("JavaScript", 1, 100),
            "HTML5" => new Skill("HTML5", 2, 58),
            "CSS3" => new Skill("CSS3", 4, 32),
            "PHP" => new Skill("PHP", 2, 75),
            "CodeIgniter" => new Skill("CodeIgniter", 5, 10),
        );

        // Instanciation du projet
        $this->project = new Project("Portfolio", "Ultima Syriarum est...", "https://www.valentin-fortin.pro", $this->skills);
    }

    /**
     * Test de la méthode addSkills
     * @return void
     */
    public function testAddSkills(): void
    {
        // Instanciation de nouvelles compétences de test
        $skills = array(
            "Bootstrap" => new Skill("Bootstrap", 1, 10),
            "Tailwind" => new Skill("Tailwind", 9, 23),
            "Angular" => new Skill("Angular", 4, 32),
        );

        // Ajout des compétences au projet
        $this->project->addSkills($skills);

        // Vérifier pour chaque compétence sa présence au sein du projet
        foreach($skills as $skill)
        {
            $this->assertTrue(in_array($skill, $this->project->getSkills()), "test");
        }
    }
}