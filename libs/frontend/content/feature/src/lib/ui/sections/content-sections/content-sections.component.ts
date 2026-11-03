import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from '@internal/content-web-feature/lib/ui/sections/about-section/about-section.component';
import { JourneySectionComponent } from '@internal/content-web-feature/lib/ui/sections/journey-section/journey-section.component';
import { ProjectsSectionComponent } from '@internal/content-web-feature/lib/ui/sections/projects-section/projects-section.component';
import { SkillsSectionComponent } from '@internal/content-web-feature/lib/ui/sections/skills-section/skills-section.component';

/**
 * Component ContentSectionsComponent
 * @class ContentSectionsComponent
 *
 * @description
 * Composes the public home page content sections in projects, journey, skills, and about order.
 */
@Component({
  selector: 'content-sections',
  imports: [
    AboutSectionComponent,
    JourneySectionComponent,
    ProjectsSectionComponent,
    SkillsSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <content-projects-section />
    <content-journey-section />
    <content-skills-section />
    <content-about-section />
  `,
})
export class ContentSectionsComponent {}
