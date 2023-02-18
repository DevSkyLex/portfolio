<?php

namespace App\Libraries\Career;
use App\Libraries\Utils\Category;

/**
 * Classe Career (parcours) : classe permettant la création et la gestion
 * des parcours et expériences professionnel et scolaire du portfolio. Elle utilise
 * les {@link Category} pour différencier les parcours pro des parcours scolaire.
 *
 * @package App\Libraries\Career
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @version 1.0.0
 */
class Career
{
    #region Propriété.s
    /**
     * Intitulé du parcours
     * @var string
     */
    private string $label;

    /**
     * Description du parcours
     * @var string
     */
    private string $description;

    /**
     * Catégorie du parcours
     * @var Category
     */
    private Category $category;
    #endregion

    #region Constructeur
    /**
     * Constructeur de la classe Career
     * @param string $label
     * @param string $description
     * @param Category $category
     */
    public function __construct(string $label, string $description, Category $category)
    {
        $this->label = $label;
        $this->description = $description;
        $this->category = $category;
    }
    #endregion

    #region Accesseur.s
    /**
     * Retourne l'intitulé du parcours
     * @return string
     */
    public function getLabel(): string
    {
        return $this->label;
    }

    /**
     * Retourne la description du parcours
     * @return string
     */
    public function getDescription(): string
    {
        return $this->description;
    }

    /**
     * Retourne la catégorie du parcours
     * @return Category
     * @see Category
     */
    public function getCategory(): Category
    {
        return $this->category;
    }
    #endregion
}