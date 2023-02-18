// Liste des points de rupture : media query
const mediaQueries = {
    "sm" : window.matchMedia("(min-width: 640px)"),
    "md" : window.matchMedia("(min-width: 768px)"),
    "lg" : window.matchMedia("(min-width: 1024px)"),
    "xl" : window.matchMedia("(min-width: 1280px)"),
    "2xl" : window.matchMedia("(min-width: 1580px)"),
};

/**
 * Afficher le menu version mobile (responsive design)
 * @param {HTMLElement} button Élément se rapportant au bouton d'éxécution.
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @version 1.0.0
 */
function toggleNavMenu(button)
{
    if(!mediaQueries.md.matches)
    {
        // Récupération de l'identifiant de l'élément parent
        let parent = document.getElementById(button.id);

        // Récupération des éléments enfants
        let childs = Object.values(parent.children);

        // Recherche dans les enfants du bouton d'éxécution
        childs.forEach(child =>
        {
            // Récupération de l'attribut de l'enfant courant
            let currentIcon = child.getAttribute('data-icon');

            // Remplace la valeur de l'attribut: vrai -> faux, faux -> vrai
            child.setAttribute("data-icon", currentIcon === "false" ? "true" : "false");
        })

        // Récupération du menu
        let mobileMenuAttribut = document.getElementById('navMobile-menu').getAttribute("data-nav");

        // Défini l'état de visibilité du menu de navigation
        viewNavMenu(mobileMenuAttribut === "false");
    }
    else viewNavMenu(false);
};

/**
 * Permet l'affichage du menu de navigation mobile
 * @param {Boolean} state État du menu
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @version 1.0.0
 */
function viewNavMenu(state)
{
    // Récupération du menu
    let mobileMenu = document.getElementById('navMobile-menu');

    // Défini l'attribut data-nav
    mobileMenu.setAttribute("data-nav", state);
}

/**
 * Fonction pour révéler les éléments au fur et à mesure du défilement de la page
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 * @version 1.0.0
 */
function revealOnScroll() 
{
    // Sélectionne tous les éléments avec la classe "reveal"
    let listItems = [...document.querySelectorAll(".reveal")];

    // Définit les options pour l'observateur d'intersection
    let options = {
      rootMargin: "-10%",
      threshold: 0.0,
    };

    // Crée un nouvel observateur d'intersection
    let observer = new IntersectionObserver((entries) => {
      // Boucle à travers les entrées
      entries.forEach((entry) => {
        // Si l'élément est en train d'être intersecté
        if (entry.isIntersecting) {
          // Ajoute la classe "active" à l'élément
          entry.target.classList.add("active");
        }
      });
    }, options);

    // Observe chaque élément de la liste
    listItems.forEach((item) => {
      observer.observe(item);
    });
  };

  // Appelle la fonction pour révéler les éléments au fur et à mesure du défilement de la page
  revealOnScroll();

/**
 * Animation de la valeur d'un élément HTML identifié par un ID
 * @param {String} selector Classe de l'élément HTML
 * @param {int} start Valeur de départ
 * @param {int} duration Temps de l'animation d'incrémentation de la valeur
 */
function animateValue(selector, start, duration)
{
    // Récupère l'objet HTML qui doit afficher la valeur animée en utilisant son identifiant
    let objs = document.getElementsByClassName(selector);

    objs = Array.from(objs);

    objs.forEach((obj) => 
    {
      // Récupère la valeur de l'élément HTML
      let end = parseInt(obj.innerHTML);

      // Calcule la plage de la valeur de départ à la valeur finale
      let range = end - start;

      // Définit la valeur courante comme étant la valeur de départ
      let current = start;

      // Définit l'incrément en fonction de la direction (vers le haut ou vers le bas)
      let increment = end > start? 1 : -1;

      // Calcule le temps pour chaque étape en fonction de la durée totale et de la plage de valeurs
      let stepTime = Math.abs(Math.floor(duration / range));

      // Définit une boucle en utilisant setInterval()
      let timer = setInterval(function()
      {
        // Incrémente la valeur courante
        current += increment;

        // Met à jour la valeur affichée dans l'objet HTML
        obj.innerHTML = current;

        // Si la valeur courante atteint la valeur finale, arrête la boucle en appelant clearInterval()
        if (current == end)
        {
          clearInterval(timer);
        }
      }, stepTime);
    });
}

animateValue("animate-value", 0, 1000);