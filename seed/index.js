'use strict';
var _ = require('lodash');
var yeoman = require('yeoman-generator');
var path = require('path');
var yosay = require('yosay');
var elementNameValidator = require('validate-element-name');
var chalk = require('chalk');

module.exports = yeoman.generators.Base.extend({
  constructor: function () {
    var themeNameObj;
    yeoman.generators.Base.apply(this, arguments);

    this.argument('element-name', {
      desc: 'Tag name of the element and directory to generate.',
      required: true,
    });

    this.option('skip-install', {
      desc: 'Whether bower dependencies should be installed',
      defaults: true,
    });

    this.option('skip-install-message', {
      desc: 'Whether commands run should be shown',
      defaults: false,
    });
    this.option('i18n', {
      desc: 'Whether your component uses i18n',
      type: Boolean
    });
    this.option('useTheme', {
      desc: 'Whether your component going to use a theme',
      type: Boolean
    });
    this.option('themeName', {
      desc: 'Whether your component will use a theme'
    });
    this.option('themeBase', {
      desc: 'Whether the theme is going to be on top of theme-base',
      type: Boolean
    });

    // Have Yeoman greet the user.
    this.log(yosay('Out of the box I include Cells\'s seed-element.'));

    if (this.options.themeName) {
      try {
        themeNameObj = JSON.parse(this.options.themeName.replace(/\'/g, '"'));
      } catch (e) {
        themeNameObj = this.options.themeName;
      }
    }

    this.i18n = (this.options.i18n == "true");
    this.includeWCT = true;
    this.useTheme = (this.options.useTheme == "true");

    if (this.useTheme) {
      this.themeName = themeNameObj.theme || themeNameObj;
      this.themeVersion = themeNameObj.version || '';
      this.themeBase = (this.options.themeBase == "true");
    }

    this.sourceRoot(path.join(path.dirname(this.resolved), 'templates/seed-element'));
  },
  askfor: function() {
    var done = this.async();
    var _this = this;

    var prompts = [{
        name: 'i18n',
        message: 'Is your component going to use i18n?',
        type: 'confirm'
      }, {
        name: 'useTheme',
        message: 'Would you use a theme?',
        type: 'confirm'
      }, {
        when: function (resp) {
          return resp.useTheme;
        },
        name: 'themeName',
        message: 'What\'s your component\'s theme?',
        type: 'list',
        choices:[{
          name: 'theme-base',
          value: { theme: 'theme-base', version: '#^1.0.2' },
          checked: false
        }, {
          name: 'cells-composer-ui-theme',
          value: { theme: 'cells-composer-ui-theme', version: '#^0.4.1' },
          checked: false
        }, {
          name: 'cc-ui-theme',
          value: { theme: 'cc-ui-theme', version: '#~0.1.14' },
          checked: false
        }, {
          name: 'glomo-ui-theme',
          value: { theme: 'glomo-ui-theme', version: '#^0.1.0' },
          checked: false
        }, {
          name: 'Other...',
          checked: false
        }]
      }, {
        when: function (resp) {
          return resp.themeName === 'Other...';
        },
        name: 'themeName',
        message: 'What\'s the theme name?'
      }, {
        when: function(resp) {
          return resp.useTheme && resp.themeName.theme !== 'theme-base';
        },
        name: 'themeBase',
        message: 'Want to use on top of theme-base?',
        type: 'confirm'
      }
    ];

    // Remove already known questions
    prompts.forEach(function(prompt, idx) {
      if(_this.options[prompt.name]) {
          prompts.splice(idx, 1);
      }
    });

    this.prompt(prompts, function (props) {
      this.i18n = this.i18n || props.i18n;
      this.includeWCT = true;
      this.useTheme = this.useTheme || props.useTheme;
      if (this.useTheme) {
        this.themeName = this.themeName || props.themeName.theme || props.themeName;
        this.themeVersion = this.themeVersion || props.themeName.version || '';
        this.themeBase = this.themeBase || props.themeBase;
      }

      done();
    }.bind(this));

  },
  validate: function () {
    this.elementName = this['element-name'];
    var result = elementNameValidator(this.elementName);

    if (!result.isValid) {
      this.emit('error', new Error(chalk.red(result.message)));
    }

    if (result.message) {
      console.warn(chalk.yellow(result.message + '\n'));
    }

    return true;
  },

  seed: function () {

    var renameElement = function (file) {
      return file.replace(/seed-element/g, this.elementName);
    }.bind(this);

    // Handle bug where npm has renamed .gitignore to .npmignore
    // https://github.com/npm/npm/issues/3763
    if (this.src.isFile('.npmignore')) {
      this.copy('.npmignore', '.gitignore');
    } else {
      this.copy('.gitignore', '.gitignore');
    }

    this.copy('bower.json', 'bower.json', function(file) {
      var manifest = JSON.parse(file);
      var theme_repo_url = 'https://descinet.bbva.es/stash/scm/ct/' + this.themeName + '.git' + this.themeVersion;

      manifest.name = this.elementName;
      manifest.main = [this.elementName + '.html'];
      if (!this.includeWCT) {
        delete manifest.devDependencies['web-component-tester'];
      }

      if (!this.i18n) {
        delete manifest.keywords['i18n'];
        delete manifest.dependencies['cells-i18n-behavior'];
      }

      // Add theme dependency
      if (this.useTheme) {
        manifest.devDependencies[this.themeName] = theme_repo_url;
        if(!this.themeBase && this.themeName !== 'theme-base') {
          delete manifest.devDependencies['theme-base'];
        }
      }

      return JSON.stringify(manifest, null, 2);
    }.bind(this));

    this.copy('index.html', 'index.html', renameElement);
    this.copy('README.md', 'README.md', renameElement);
    this.copy('seed-element.js', this.elementName + '.js', renameElement);
    this.copy('seed-element.html', this.elementName + '.html', renameElement);
    this.copy('seed-element.scss', this.elementName + '.scss', renameElement);
    this.copy('demo/js/demo.js', 'demo/js/demo.js', renameElement);
    this.copy('demo/css/demo-styles.html', 'demo/css/demo-styles.html', renameElement);
    this.copy('demo/index.html', 'demo/index.html', renameElement);
    this.copy('images/cells.svg', 'images/cells.svg', renameElement);

    if (this.includeWCT) {
      this.copy('test/index.html', 'test/index.html', renameElement);
      this.copy('test/basic-test.html', 'test/basic-test.html', renameElement);
    }

    if (this.i18n) {
      this.copy('locales/en.json', 'locales/en.json', renameElement);
      this.copy('locales/es.json', 'locales/es.json', renameElement);
      this.copy('demo/js/I18nMsg.js', 'demo/js/I18nMsg.js', renameElement);
    }
  },
  install: function () {
    this.installDependencies({
      npm: false,
      skipInstall: this.options['skip-install'],
      skipMessage: this.options['skip-install-message']
    });
  }
});
