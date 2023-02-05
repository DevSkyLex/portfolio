<?php

namespace App\Models\Project;
use CodeIgniter\Model;
use App\Libraries\Project\Project;
use App\Libraries\Project\Skill;
use Exception;

/**
 * Modèle de gestion des projets
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
class ProjectModel extends Model
{
    #region Insertion base de données
    /**
     * Insertion des projets à la base de données
     * @param array<Skill> $projects
     * @throws Exception
     * @return bool
     */
    static public function insertProjects(...$projects): bool
    {
        // Connexion à la base de données
        $db = db_connect();

        // Vérification de.s projet.s à ajouter à la base de données
        foreach($projects as $project)
        {
            // Vérification du type de l'élément
            if(!$project instanceof Project)
            {
                // Erreur : l'élément n'est pas une instance de la classe Project
                throw new Exception("L'élément donné en paramètre ne contient de Project (projet)");
            }

            // Requête d'insertion du projet
            $query = $db->table('projects')->insert($project);
        }

        // Déconnexion à la base de données
        $db->close();

        // Retourne vrai ou faux en fonction de la réussite ou non de l'insertion.
        return $query;
    }

    /**
     * Insertion des compétences à la base de données
     * @param array<Skill> $skills
     * @throws Exception
     * @return bool
     */
    static public function insertSkills(...$skills): bool
    {
        // Connexion à la base de données
        $db = db_connect();

        // Vérification de.s compétence.s à ajouter à la base de données
        foreach($skills as $skill)
        {
            // Vérification du type de l'élément
            if(!$skill instanceof Skill)
            {
                // Erreur : l'élément n'est pas une instance de la classe Project
                throw new Exception("L'élément donné en paramètre ne contient de Skill (compétence)");
            }

            // Requête d'insertion du projet
            $query = $db->table('skills')->insert($skill);
        }

        // Déconnexion à la base de données
        $db->close();

        // Retourne vrai ou faux en fonction de la réussite ou non de l'insertion.
        return $query;
    }
    #endregion

    #region Récupération des données
    /**
     * Récupération d'un projet grâce à l'id de celui-ci
     * @param int $id
     * @return Project|bool
     */
    static public function selectProject(int $id): Project|bool
    {
        // Valeur par défaut
        $result = false;

        // Connexion à la base de données
        $db = db_connect();

        // Requête permettant de récupérer les données d'un projet
        $project_query = $db->table('projects')
            ->getWhere(["id" => $id]);

        // Requête permettant de récupérer les données des compétences
        $skills_query = $db->table('project_skill')
            ->select("skills.*")
            ->join("skills", "project_skill.skill_id = skills.id")
            ->getWhere("project_skill.project_id = $id");

        // Vérification du résultat de la requête
        if(($project_query->getFieldCount() > 0) && ($skills_query->getFieldCount() > 0))
        {
            // Récupération des données
            $project = $project_query->getResultArray()[0];
            $skills = $skills_query->getResultArray();

            // Initialisation d'une collection temporaire
            $skills_temp = array();

            // Ajout des compétences dans la collection temporaire
            foreach($skills as $skill)
            {
                array_push($skills_temp, new Skill($skill["name"], $skill["level"], $skill["percent"]));
            }

            // Création d'un objet Project avec les infomations recueillis depuis la base de données
            $result = new Project($project["title"], $project["description"], $project["link"], $skills_temp);
        }

        // Déconnexion à la base de données
        $db->close();

        // Retourne vrai ou faux en fonction de la réussite ou non de l'insertion.
        return $result;
    }

    /**
     * Récupération de tout les projets
     * @return array|false
     */
    static public function selectAllProjects(): array|false
    {
        // Valeur par défaut
        $result = false;

        // Connexion à la base de données
        $db = db_connect();

        // Requête permettant de récupérer les données d'un projet
        $projects_query = $db->table('projects')->get();

        // Vérification du résultat de la requête
        if ($projects_query->getFieldCount() > 0) 
        {
            // Initialisation du tableau contenant les projets et leurs compétences
            $result = array();
            
            foreach ($projects_query->getResultArray() as $project) 
            {
                // Requête permettant de récupérer les données des compétences
                $skills_query = $db->table('project_skill')
                    ->select("skills.*")
                    ->join("skills", "project_skill.skill_id = skills.id")
                    ->getWhere("project_skill.project_id = " . $project['id']);

                // Vérification du résultat de la requête
                if ($skills_query->getFieldCount() > 0) 
                {
                    $skills = $skills_query->getResultArray();

                    // Initialisation d'un tableau temporaire
                    $skills_temp = array();

                    // Ajout des compétences dans le tableau temporaire
                    foreach ($skills as $skill) {
                        array_push($skills_temp, new Skill($skill["name"], $skill["level"], $skill["percent"]));
                    }

                    // Création d'un objet Project avec les infomations recueillis depuis la base de données
                    array_push($result, new Project($project["title"], $project["description"], $project["link"], $skills_temp));
                }
            }
        }

        // Déconnexion à la base de données
        $db->close();

        // Retourne vrai ou faux en fonction de la réussite ou non de l'insertion.
        return $result;
    }
    #endregion
}