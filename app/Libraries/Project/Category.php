<?php

namespace App\Libraries\Project;

/**
 * Classe Category (Catégorie)
 * @package App\Libraries\Project
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
class Category
{
    #region Propriété.s
    /**
     * Intitulé de la catégorie
     * @var string
     */
    private string $label;

    /**
     * Description de la catégorie
     * @var string
     */
    private string $description;
    #endregion

    #region Constructeur
    /**
     * Constructeur de la classe Category
     * @param string $label
     * @param string $description
     */
    public function __construct(string $label, string $description)
    {
        $this->label = $label;
        $this->description = $description;
    }
    #endregion

    #region Accesseur.s
    /**
     * Retourne l'intitulé de la catégorie
     * @return string
     */
    public function getLabel(): string
    {
        return $this->label;
    }

    /**
     * Retourne la description de la catégorie
     * @return string
     */
    public function getDescription(): string
    {
        return $this->description;
    }
    #endregion
}