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
 */
function viewNavMenu(state)
{
    // Récupération du menu
    let mobileMenu = document.getElementById('navMobile-menu');

    // Défini l'attribut data-nav
    mobileMenu.setAttribute("data-nav", state);

    document.addEventListener('click', (event) => {
        if (!menu.contains(event.target)) {
            menu.setAttribute("data-nav", "false");
            document.removeEventListener("click", closeMobileMenu);
        }
    });
}