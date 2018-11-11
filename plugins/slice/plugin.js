/**
 * @file
 * Slice plugin.
 *
 * This adds a container around nested plugins that can be used to display
 * full-width imagery, background colors, etc.
 *
 * @see http://docs.ckeditor.com/#!/guide/widget_sdk_tutorial_1
 * @see http://docs.ckeditor.com/#!/guide/widget_sdk_tutorial_2
 * @see http://docs.ckeditor.com/#!/guide/dev_allowed_content_rules-section-2
 *
 * @ignore
 */

(function ($, Drupal, CKEDITOR) {

  var pluginName = 'slice';

  CKEDITOR.plugins.add(pluginName, {
    // We are not creating a simple plugin that manipulates the editor body,
    // but a widget using the CKEditor Widget API. We therefore need to list
    // it as a requirement.
    requires: 'widget',

    // Expose icons we can use (comma-separated list). Needs to match the name
    // of the widget that uses it or the name of the manually defined button as
    // a lowercase string.
    icons: pluginName,

    // When set to true, we can use high DPI icons. They need to reside in a
    // folder called 'icons/hidpi' instead of just 'icons'.
    hidpi: false,

    init: function (editor) {
      // Whenever you see the code access conf.* or text.* below, it is coming
      // from the ::getConfig() method on the CKEditorPlugin plugin. We do this
      // to avoid having to change the JavaScript whenever a label needs
      // updating or the dialog needs an extra option in a select element.
      var conf = editor.config[pluginName];
      var text = conf.strings;

      // Add the slice widget to the editor. Name of the widget needs to match
      // the name of the button as defined in the Drupal CKEditorPlugin plugin,
      // albeit a case insensitive match.
      //
      // The same rule would apply if you were to add a button manually using
      // editor.ui.addButton(), but then the button name has to match with case
      // sensitivity. I haven't figured out why they behave differently.
      editor.widgets.add(pluginName, {
        // The button property will automatically add a button to the toolbar
        // if it can find one with the name of the widget. Buttons are added
        // by Drupal when it calls ::getButtons() on the CKEditorPlugin plugin.
        button: text.buttonLabel,

        // The template property defines the HTML structure that will be added
        // to the editor as an immutable structure. This ensures no-one messes
        // with the template, skewing the output.
        template: [
          '<div data-widget-label="' + text.widgetWrapperLabel + '" data-widget-config="" data-widget-type="' + pluginName + '" data-wrapper-widget="">',
          '<div data-widget-label="' + text.widgetContentLabel + '" data-widget-content="content"></div>',
          '<div data-widget-label="' + text.widgetImageLabel + '" data-widget-content="image"></div>',
          '</div>'
        ].join(''),

        // The editables property defines CSS selectors to find those parts
        // that have editable content. They have to be defined in the order of
        // appearance within the template.
        editables:  {
          // You can choose what name you give each section. You can also limit
          // what can be placed within each section by specifying the
          // allowedContent property.
          content: {
            selector: '[data-widget-content="content"]',
            allowedContent: editor.config.deesonShared.textAndLayoutACR
          },
          image: {
            selector: '[data-widget-content="image"]',
            // The Allowed Content Rule comes from DeesonCKEditorPluginBase.
            allowedContent: editor.config.deesonShared.imageACR
          }
        },

        // The allowedContent property adds extra rules to CKEditor's Advanced
        // Content Filter, making sure our classes don't get stripped. For the
        // syntax, see dev_allowed_content_rules-section-2.
        allowedContent: editor.config.deesonShared.widgetWrapperACR,

        // The requiredContent takes the allowedContent one step further by
        // specifying what the widget needs at a minimum in order to function.
        // If the ACF is not appended because there is a global user-defined
        // filter override, the widget will not be available to use.
        //
        // Seeing how our widgets are styled and processed by their data
        // attributes, there is no minimum viable ACR we can apply. It's all or
        // nothing, so we use the same ACR for allowed- and requiredContent.
        requiredContent: editor.config.deesonShared.widgetWrapperACR,

        // The upcast method will figure out whether copy-pasted code in the
        // source view represents a widget. If so, it will convert the pasted
        // HTML into the same immutable structure that we would receive if
        // we inserted the template using the button.
        upcast: function(element) {
          return element.name == 'div' &&
            element.attributes['data-widget-type'] == pluginName &&
            !!element.getFirst(function (child) {
              return child.name == 'div' && child.attributes['data-widget-content'] == 'content';
            }) &&
            !!element.getFirst(function (child) {
              return child.name == 'div' && child.attributes['data-widget-content'] == 'image';
            });
        },

        // This widget is configurable, so we need to tell CKEditor what dialog
        // it needs to use for the configuration. The dialog itself is defined
        // below.
        dialog: pluginName,

        // The init function is called whenever the widget is first loaded.
        init: function() {
          var data = this.element.getAttribute('data-widget-config');
          this.data = (data && JSON.parse(data)) || {mode: 'transparent', colour: 'inherit'};
          this.afterChange();
        },

        // The data function is called whenever the widget data is manipulated.
        data: function() {
          this.element.setAttribute('data-widget-config', JSON.stringify(this.data));
          this.afterChange();
        },

        // Custom function to react after the init or data function has fired.
        afterChange: function() {
          // Change the label based on the selected option.
          var label = text.widgetWrapperLabel + ' (' + conf.mode[this.data.mode] + ')';
          this.element.setAttribute('data-widget-label', label);

          // Toggle the visibility of the image upload box.
          $(this.element['$']).children('[data-widget-content="image"]').toggle(this.data.mode == 'image');
        }
      });

      // Add the dialog our widget uses to the editor.
      CKEDITOR.dialog.add(pluginName, function(editor) {
        var modeSelect = {
          id: 'mode',
          type: 'select',
          label: text.dialogModeLabel,
          items: [],
          setup: function(widget) {
            this.setValue(widget.data.mode);
            this.onChange()
          },
          commit: function(widget) {
            widget.setData('mode', this.getValue());
            this.onChange();
          },
          // This fires whenever an option is selected.
          onChange: function() {
            var dialog = this.getDialog();

            // Only show the colour picker when the slice uses it.
            if (this.getValue() == 'colour') {
              dialog.getContentElement('basic', 'colour').getElement().show();
            }
            else {
              dialog.getContentElement('basic', 'colour').getElement().hide();
            }
          }
        };

        // We load the options for the select from Drupal so we don't have to
        // edit our JavaScript all the time.
        $.each(conf.mode, function(index, value) {
          modeSelect.items.push([value, index]);
        });

        var colourSelect = {
          id: 'colour',
          type: 'select',
          label: text.dialogColourLabel,
          items: [],
          setup: function(widget) {
            this.setValue(widget.data.colour);
          },
          commit: function(widget) {
            widget.setData('colour', this.getValue());
          }
        };
        $.each(conf.colour, function(index, value) {
          colourSelect.items.push([value, index]);
        });

        return {
          title: text.dialogLabel,
          // The contents property holds a list of tabs the dialog should have.
          contents: [
            {
              id: 'basic',
              label: text.dialogTabLabel,
              elements: [modeSelect, colourSelect]
            }
          ]
        };
      });
    }
  });

})(jQuery, Drupal, CKEDITOR);
