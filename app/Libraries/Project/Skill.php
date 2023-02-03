<?php

namespace App\Libraries\Project;

/**
 * Classe Skill (compétence)
 * @package App\Libraries\Project
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
class Skill
{
    #region Propriété.s
    /**
     * Nom de la compétence
     * @var string
     */
    private string $name;

    /**
     * Niveau de la compétence
     * @var int
     */
    private int $level;

    /**
     * Pourcentage de la compétence
     * @var int
     */
    private int $percent;
    #endregion

    #region Constructeur
    /**
     * Constructeur de la classe Skill
     * @param string $name
     * @param int $level
     * @param int $percent
     */
    public function __construct(string $name, int $level, int $percent)
    {
        $this->name = $name;
        $this->level = $level;
        $this->percent = $percent;
    }
    #endregion

    #region Assesseur.s
    /**
     * Retourne le nom de la compétence
     * @return string
     */
    public function getName(): string
    {
        return $this->name;
    }

    /**
     * Retourne le niveau de la compétence
     * @return int
     */
    public function getLevel(): int
    {
        return $this->level;
    }

    /**
     * Retourne le pourcentage de la compétence
     * @return string
     */
    public function getPercent(): string
    {
        return $this->percent + "%";
    }
    #endregion
}