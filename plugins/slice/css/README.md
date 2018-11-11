You can drop a CSS file in this folder and include it in the CKEditor body using the following code in your Drupal CKEditorPlugin plugin class:
```
  /**
   * {@inheritdoc}
   */
  public function getCssFiles(Editor $editor) {
    $css = parent::getCssFiles($editor);
    $css[] = $this->pluginsDir . '/PLUGINDIR/css/extra.css';
    return $css;
  }
```
Make sure you have the parent call in there to include the default CSS.
