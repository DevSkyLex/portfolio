import type { ProfileLinkDto } from '@vfortin/content-contracts';
import type { SiteLink, SiteLinkKind } from '@vfortin/content-web-model';

/**
 * Constant BRAND_NAMES
 *
 * @description
 * Default label of a profile link, the brand's own spelling in every locale.
 */
const BRAND_NAMES: Readonly<Record<Exclude<SiteLinkKind, 'email' | 'website'>, string>> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  malt: 'Malt',
};

/**
 * Function defaultLabel
 *
 * @description
 * Label of a link written without one: the address of an e-mail, the brand of a profile, the host
 * (without `www.`) of a website.
 *
 * @param {ProfileLinkDto} link - Snapshot link.
 *
 * @returns {string} Default label.
 */
function defaultLabel(link: ProfileLinkDto): string {
  switch (link.kind) {
    case 'email':
      return link.url.slice('mailto:'.length);
    case 'website':
      return new URL(link.url).hostname.replace(/^www\./, '');
    case 'github':
    case 'linkedin':
    case 'malt':
      return BRAND_NAMES[link.kind];
  }
}

/**
 * Function toSiteLinks
 *
 * @description
 * Maps the snapshot links to display links, in their order. Only the prerender validates the
 * snapshot (D10), so a raw snapshot without the field reads as having none.
 *
 * @param {readonly ProfileLinkDto[] | undefined} links - Snapshot links.
 *
 * @returns {SiteLink[]} Display links.
 */
export function toSiteLinks(links: readonly ProfileLinkDto[] | undefined): SiteLink[] {
  return (links ?? []).map((link: ProfileLinkDto): SiteLink => ({
    kind: link.kind,
    href: link.url,
    label: link.label ?? defaultLabel(link),
  }));
}
