/**
 * Template Loader
 * Loads HTML template files and injects them into the page
 */
(function () {
  'use strict';

  /**
   * Load templates from external file
   */
  async function loadTemplates() {
    try {
      const response = await fetch('includes/modal-templates.html');
      
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = html;
      
      // Append all template elements to body
      const templates = container.querySelectorAll('template');
      templates.forEach(template => {
        document.body.appendChild(template);
      });
      
      console.log(`✓ Loaded ${templates.length} modal templates`);
      
      // Dispatch event to signal templates are ready
      document.dispatchEvent(new CustomEvent('templatesLoaded'));
      
      return true;
    } catch (error) {
      console.error('Error loading templates:', error);
      return false;
    }
  }

  /**
   * Load templates on DOMContentLoaded
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTemplates);
  } else {
    loadTemplates();
  }

  // Export for manual loading if needed
  window.HSK_TEMPLATES = {
    load: loadTemplates
  };
})();
