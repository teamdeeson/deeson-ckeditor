<?php

namespace Drupal\deeson_ckeditor\Plugin\CKEditorPlugin;

use Drupal\editor\Entity\Editor;

/**
 * @CKEditorPlugin(
 *   id = "slice",
 *   label = @Translation("Slice")
 * )
 */
class Slice extends DeesonCKEditorPluginBase {

  /**
   * {@inheritdoc}
   */
  protected function getButtonLabel() {
    return $this->t('Add slice layout');
  }

  /**
   * {@inheritdoc}
   */
  protected function getUiStrings() {
    return [
      'widgetWrapperLabel' => $this->t('Slice layout'),
      'widgetContentLabel' => $this->t('Content'),
      'widgetImageLabel' => $this->t('Image'),
      'dialogLabel' => $this->t('Configure slice layout'),
      'dialogTabLabel' => $this->t('Basic configuration'),
      'dialogModeLabel' => $this->t('Display mode'),
      'dialogColourLabel' => $this->t('Choose colour'),
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getConfig(Editor $editor) {
    $config = parent::getConfig($editor);
    $config[$this->getPluginId()]['mode'] = [
      'transparent' => $this->t('Transparent'),
      'image' => $this->t('Background image'),
      'pattern' => $this->t('Background pattern'),
      'colour' => $this->t('Background colour'),
    ];
    $config[$this->getPluginId()]['colour'] = ['inherit' => $this->t('Use page colour')];
    return $config;
  }

}
