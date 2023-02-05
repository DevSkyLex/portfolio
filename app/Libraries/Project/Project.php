<?php

namespace App\Libraries\Project;
use App\Libraries\Project\Skill;
use Exception;

/**
 * Classe Project (projet)
 * @package App\Libraries\Project
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
class Project
{
    #region Propriété.s
    /**
     * Titre du projet
     * @var string
     */
    private string $title;

    /**
     * Description du projet
     * @var string
     */
    private string $description;

    /**
     * Compétences du projet
     * @var array
     */
    private array $skills;

    /**
     * Lien vers le projet
     * @var string|null
     */
    private ?string $link;
    #endregion

    #region Constructeur
    /**
     * Constructeur de la classe Project
     * @param string $title
     * @param string $description
     * @param array $skills
     * @param string $link
     * @throws Exception
     */
    public function __construct(string $title, string $description, ?string $link, ...$skills)
    {
        $this->title = $title;
        $this->description = $description;
        $this->skills = array();

        // Vérification du paramètre $skills (Si le paramètre est un tableau)
        if (count($skills) === 1 && is_array($skills[0])) 
        {
            $skills = $skills[0];
        }

        // Vérification et ajout de.s compétence.s
        try { $this->addSkills($skills); }
        catch (Exception $e) { throw new Exception($e->getMessage()); }

        if(isset($link)) 
        {
            // Vérification et ajout du lien au projet
            try { $this->setLink($link); }
            catch (Exception $e) { throw new Exception($e->getMessage()); }
        }
    }
    #endregion

    #region Accesseur.s
    /**
     * Retourne le titre
     * @return string
     */
    public function getTitle(): string
    {
        return $this->title;
    }

    /**
     * Retourne la description
     * @return string
     */
    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * Retourne les compétences
     * @return array
     */
    public function getSkills(): array
    {
        return $this->skills;
    }

    /**
     * Retourne le lien du projet
     * @return string
     */
    public function getLink(): string
    {
        return $this->link;
    }
    #endregion

    #region Mutateur.s
    /**
     * Défini le titre du projet
     * @param string $title
     * @return void
     */
    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    /**
     * Défini la description du projet
     * @param string $description
     * @return void
     */
    public function setDescription(string $description): void
    {
        $this->description = $description;
    }

    /**
     * Défini le lien du projet (URL)
     * @param string $link
     * @throws Exception
     * @return void
     */
    public function setLink(string $link): void
    {
        // Vérification du lien (URL)
        if(!filter_var($link, FILTER_VALIDATE_URL))
        {
            // Erreur : le lien n'est pas valide
            throw new Exception("Le lien '$link' n'est pas valide !");
        }
        else
        {
            // Ajout du lien au projet
            $this->link = $link;
        }
    }
    #endregion

    #region Méthode.s
    /**
     * Ajoute une/des compétence.s au projet
     * @param array $skills
     * @throws Exception
     * @return void
     */
    public function addSkills(...$skills): void
    {
        // Vérification du paramètre $skills (Si le paramètre est un tableau)
        if (count($skills) === 1 && is_array($skills[0])) 
        {
            $skills = $skills[0];
        }

        // Vérification et ajout de.s compétence.s
        foreach($skills as $skill)
        {
            // Vérification du type de l'élément
            if(!$skill instanceof Skill)
            {
                // Erreur : l'élément n'est pas une instance de la classe Skill
                throw new Exception("L'élément n'est pas une instance de Skill !");
            }

            // Vérification de la présence de l'élément dans les compétences du projet
            if(!in_array($skill, $this->skills))
            {
                // Ajout d'une compétence au projet
                array_push($this->skills, $skill);
            }
            else
            {
                // Erreur : la compétence est déjà présente au sein du projet
                throw new Exception("La compétence '".$skill->getName()."' est déjà présente dans les compétences du projet.");
            }
        }
    }
    #endregion
}