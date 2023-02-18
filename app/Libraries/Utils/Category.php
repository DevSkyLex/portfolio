<?php

namespace App\Libraries\Utils;

/**
 * Classe Category (Catégorie) : classe permettant la création et la gestion
 * des catégories. Les catégories peuvent être définies en tant que professionnelles, personnelles ou scolaires et
 * sont utilisées dans les {@link Project} et les {@link Career}.
 *
 * @package App\Libraries\Utils
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @version 1.0.0
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