<?php

namespace Drupal\deeson_ckeditor\Plugin\Filter;

use Drupal\Component\Render\FormattableMarkup;
use Drupal\Component\Utility\Html;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\filter\FilterProcessResult;
use Drupal\filter\Plugin\FilterBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a filter to display embedded CKEditor widgets.
 *
 * @Filter(
 *   id = "deeson_widget",
 *   title = @Translation("Display custom Deeson widgets"),
 *   type = Drupal\filter\Plugin\FilterInterface::TYPE_TRANSFORM_IRREVERSIBLE
 * )
 */
class Widget extends FilterBase implements ContainerFactoryPluginInterface {

  /**
   * The renderer service.
   *
   * @var \Drupal\Core\Render\RendererInterface
   */
  public $renderer;

  /**
   * Constructs a Widget object.
   *
   * @param array $configuration
   *   A configuration array containing information about the plugin instance.
   * @param string $plugin_id
   *   The plugin_id for the plugin instance.
   * @param mixed $plugin_definition
   *   The plugin implementation definition.
   * @param \Drupal\Core\Render\RendererInterface $renderer
   *   The renderer service.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, RendererInterface $renderer) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->renderer = $renderer;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('renderer')
    );
  }

  /**
   * {@inheritdoc}
   */
  public function process($text, $langcode) {
    $result = new FilterProcessResult($text);
    $result->setProcessedText($this->replaceWidgets($text));
    return $result;
  }

  /**
   * Replaces all widgets in a piece of HTML.
   *
   * @param string $text
   *   The HTML to replace widgets within.
   *
   * @return string|false
   *   The HTML with all widgets replaced.
   */
  private function replaceWidgets($text) {
    // Short-circuit if no widgets could be found.
    if (strpos($text, 'data-widget-type') === FALSE) {
      return $text;
    }

    $dom = Html::load($text);
    $xpath = new \DOMXPath($dom);
    $widgets = $xpath->query('//div[@data-widget-type and @data-widget-config]');

    /** @var \DOMElement $widget */
    foreach ($widgets as $widget) {
      // If the widget does not have a parent node in the DOM, it means we have
      // altered the DOM that represented the widget's parent widget. We skip
      // processing said widget as it will be dealt with recursively in the
      // 'div[@data-widget-content]' section further down below.
      if (!isset($widget->parentNode)) {
        continue;
      }

      $type = $widget->getAttribute('data-widget-type');
      $config = $widget->getAttribute('data-widget-config');
      $config = json_decode($config, TRUE);

      if ($type && $config) {
        $output = [
          '#theme' => 'deeson_widget',
          '#type' => $type,
          '#config' => $config,
        ];

        // Find all content areas within the widget and set their content as
        // theme variables on the template.
        foreach ($xpath->query('div[@data-widget-content]', $widget) as $content) {
          /** @var \DOMElement $content */
          $area = $content->getAttribute('data-widget-content');

          // Get all of the area's children as an HTML string.
          $content_html = '';
          while ($content->hasChildNodes()) {
            $child = $content->removeChild($content->firstChild);
            $content_html .= $dom->saveHTML($child);
          }

          // Check the area's HTML for nested widgets.
          $content_html = $this->replaceWidgets($content_html);

          // Add the processed HTML to the output.
          $output['#content'][$area] = new FormattableMarkup($content_html, []);
        }

        // Replace the content of the widget with the rendered template.
        $this->replaceNodeContent($widget, $this->renderer->render($output));
      }
    }

    return Html::serialize($dom);
  }

  /**
   * Replace the contents of a DOMNode.
   *
   * @param \DOMNode $node
   *   A DOMNode object.
   * @param string $content
   *   The text or HTML that will replace the contents of $node.
   */
  private function replaceNodeContent(\DOMNode &$node, $content) {
    if (strlen($content)) {
      // Load the content into a new DOMDocument and retrieve the DOM nodes.
      $replacement_nodes = Html::load($content)->getElementsByTagName('body')
        ->item(0)
        ->childNodes;
    }
    else {
      $replacement_nodes = [$node->ownerDocument->createTextNode('')];
    }

    foreach ($replacement_nodes as $replacement_node) {
      // Import the replacement node from the new DOMDocument into the original
      // one, importing also the child nodes of the replacement node.
      $replacement_node = $node->ownerDocument->importNode($replacement_node, TRUE);
      $node->parentNode->insertBefore($replacement_node, $node);
    }
    $node->parentNode->removeChild($node);
  }

}
