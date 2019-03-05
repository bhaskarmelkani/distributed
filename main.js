angular.module('fireideaz', [
  'firebase',
  'ngDialog',
  'lvl.directives.dragdrop',
  'ngSanitize',
  'ngAria',
  'ngFileUpload'
]);

'use strict';

angular
  .module('fireideaz')
  .service('Auth', ['$firebaseAuth', function ($firebaseAuth) {
    var mainAuthRef = $firebaseAuth();

    function logUser(user, callback) {
      var email = user + '@fireideaz.com';
      var password = user;

      mainAuthRef.$signOut();
      mainAuthRef.$signInWithEmailAndPassword(email, password).then(function(userData) {
        callback(userData);
      }, function(error) {
        console.log('Logged user failed: ', error);
        window.location.hash = '';
        location.reload();
      });
    }

    function createUserAndLog(newUser, callback) {
      var email = newUser + '@fireideaz.com';
      var password = newUser;

      mainAuthRef.$createUserWithEmailAndPassword(email, password).then(function() {
        logUser(newUser, callback);
      }, function(error) {
        console.log('Create user failed: ', error);
      });
    }

    return {
      createUserAndLog: createUserAndLog,
      logUser: logUser
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .constant('FEATURES', [
    {
      name: 'Unlimited public boards',
      free: 'X',
      premium: 'X',
    },
    {
      name: 'Create and merge cards',
      free: 'X',
      premium: 'X',
    },
    {
      name: 'Sort and search cards',
      free: 'X',
      premium: 'X',
    },
    {
      name: 'Export PDF and import/export CSV',
      free: 'X',
      premium: 'X',
    },
    {
      name: 'Edit or delete columns',
      free: 'Everyone',
      premium: 'Only board creator',
    },
    {
      name: 'Edit or delete cards',
      free: 'Everyone',
      premium: 'Only card creator and admin',
    },
    {
      name: 'Maximum columns',
      free: '6',
      premium: 'Unlimited',
    },
    {
      name: 'History and search of past retrospectives',
      free: '',
      premium: 'X',
    },
    {
      name: 'Manage multiple teams',
      free: '',
      premium: 'X',
    },
    {
      name: 'Unlimited team boards',
      free: '',
      premium: 'X',
    },
    {
      name: 'Invite people to retrospectives',
      free: '',
      premium: 'X',
    },
    {
      name: 'Order cards inside a column',
      free: '',
      premium: 'X',
    },
    {
      name: 'Change color of a column',
      free: '',
      premium: 'X',
    },
    {
      name: 'Login using Google and Email',
      free: '',
      premium: 'X',
    },
    {
      name: 'Comments on cards',
      free: '',
      premium: 'X',
    },
    {
      name: "Display card's author",
      free: '',
      premium: 'X',
    },
    {
      name: 'Pre-defined retrospective formats',
      free: '',
      premium: 'X',
    },
    {
      name: 'Clone a board',
      free: '',
      premium: 'X',
    },
    {
      name: 'Slack integration',
      free: '',
      premium: 'X',
    },
  ])
/* global EmojiPicker */
'use strict';

angular
  .module('fireideaz')

  .controller('MainCtrl', [
    '$scope',
    '$filter',
    '$window',
    'Utils',
    'Auth',
    '$rootScope',
    'FirebaseService',
    'ModalService',
    'FEATURES',
    function(
      $scope,
      $filter,
      $window,
      utils,
      auth,
      $rootScope,
      firebaseService,
      modalService,
      FEATURES
    ) {
      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = {
        name: '',
        text_editing_is_private: true
      };
      $scope.features = FEATURES;
      $scope.userId = $window.location.hash.substring(1) || '';
      $scope.searchParams = {};
      $window.location.search
        .substr(1)
        .split('&')
        .forEach(function(pair) {
          var keyValue = pair.split('=');
          $scope.searchParams[keyValue[0]] = keyValue[1];
        });
      $scope.sortField = $scope.searchParams.sort || 'date_created';
      $scope.selectedType = 1;
      $scope.import = {
        data: [],
        mapping: []
      };

      $scope.droppedEvent = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);
        var dragMessageRef = firebaseService.getMessageRef(
          $scope.userId,
          drag.attr('messageId')
        );

        dragMessageRef.once('value', function() {
          dragMessageRef.update({
            type: {
              id: drop.data('column-id')
            }
          });
        });
      };

      function getBoardAndMessages(userData) {
        $scope.userId = $window.location.hash.substring(1) || '499sm';

        var messagesRef = firebaseService.getMessagesRef($scope.userId);
        var board = firebaseService.getBoardRef($scope.userId);

        $scope.boardObject = firebaseService.getBoardObjectRef($scope.userId);

        board.on('value', function(board) {
          if (board.val() === null) {
            window.location.hash = '';
            location.reload();
          }

          $scope.board = board.val();
          $scope.maxVotes = board.val().max_votes ? board.val().max_votes : 6;
          $scope.boardId = $rootScope.boardId = board.val().boardId;
          $scope.boardContext = $rootScope.boardContext = board.val().boardContext;
          $scope.loading = false;
          $scope.hideVote = board.val().hide_vote;
          setTimeout(function() {
            new EmojiPicker();
          }, 100);
        });

        $scope.boardRef = board;
        $scope.messagesRef = messagesRef;
        $scope.userUid = userData.uid;
        $scope.messages = firebaseService.newFirebaseArray(messagesRef);
      }

      if ($scope.userId !== '') {
        auth.logUser($scope.userId, getBoardAndMessages);
      } else {
        $scope.loading = false;
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.isCensored = function(message, privateWritingOn) {
        return message.creating && privateWritingOn;
      };

      $scope.updatePrivateWritingToggle = function(privateWritingOn) {
        $scope.boardRef.update({
          text_editing_is_private: privateWritingOn
        });
      };

      $scope.updateEditingMessage = function(message, value) {
        message.creating = value;
        $scope.messages.$save(message);
      };

      $scope.getSortFields = function() {
        return $scope.sortField === 'votes'
          ? ['-votes', 'date_created']
          : 'date_created';
      };

      $scope.saveMessage = function(message) {
        message.creating = false;
        $scope.messages.$save(message);
      };

      function redirectToBoard() {
        window.location.href =
          window.location.origin +
          window.location.pathname +
          '#' +
          $scope.userId;
      }

      $scope.isBoardNameInvalid = function() {
        return !$scope.newBoard.name;
      };

      $scope.isMaxVotesValid = function() {
        return Number.isInteger($scope.newBoard.max_votes);
      };

      $scope.createNewBoard = function() {
        $scope.loading = true;
        modalService.closeAll();
        $scope.userId = utils.createUserId();

        var callback = function(userData) {
          var board = firebaseService.getBoardRef($scope.userId);
          board.set(
            {
              boardId: $scope.newBoard.name,
              date_created: new Date().toString(),
              columns: $scope.messageTypes,
              user_id: userData.uid,
              max_votes: $scope.newBoard.max_votes || 6,
              text_editing_is_private: $scope.newBoard.text_editing_is_private
            },
            function(error) {
              if (error) {
                $scope.loading = false;
              } else {
                redirectToBoard();
              }
            }
          );

          $scope.newBoard.name = '';
        };

        auth.createUserAndLog($scope.userId, callback);
      };

      $scope.changeBoardContext = function() {
        $scope.boardRef.update({
          boardContext: $scope.boardContext
        });
      };

      $scope.changeBoardName = function(newBoardName) {
        $scope.boardRef.update({
          boardId: newBoardName
        });

        modalService.closeAll();
      };

      $scope.updateSortOrder = function() {
        var updatedFilter =
          $window.location.origin +
          $window.location.pathname +
          '?sort=' +
          $scope.sortField +
          $window.location.hash;
        $window.history.pushState({ path: updatedFilter }, '', updatedFilter);
      };

      $scope.addNewColumn = function(name) {
        if (typeof name === 'undefined' || name === '') {
          return;
        }

        $scope.board.columns.push({
          value: name,
          id: utils.getNextId($scope.board)
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        if (typeof newName === 'undefined' || newName === '') {
          return;
        }

        $scope.board.columns.map(function(column, index, array) {
          if (column.id === id) {
            array[index].value = newName;
          }
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.deleteColumn = function(column) {
        $scope.board.columns = $scope.board.columns.filter(function(_column) {
          return _column.id !== column.id;
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));
        modalService.closeAll();
      };

      $scope.deleteMessage = function(message) {
        $scope.messages.$remove(message);

        modalService.closeAll();
      };

      function addMessageCallback(message) {
        var id = message.key;
        angular.element($('#' + id)).scope().isEditing = true;
        new EmojiPicker();
        $('#' + id)
          .find('textarea')
          .focus();
      }

      $scope.addNewMessage = function(type) {
        $scope.messages
          .$add({
            text: '',
            creating: true,
            user_id: $scope.userUid,
            type: {
              id: type.id
            },
            date: firebaseService.getServerTimestamp(),
            date_created: firebaseService.getServerTimestamp(),
            votes: 0
          })
          .then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        modalService.closeAll();
      };

      $scope.deleteBoard = function() {
        $scope.deleteCards();
        $scope.boardRef.ref.remove();

        modalService.closeAll();
        window.location.hash = '';
        location.reload();
      };

      $scope.submitOnEnter = function(event, method, data) {
        if (event.keyCode === 13) {
          switch (method) {
            case 'createNewBoard':
              if (!$scope.isBoardNameInvalid()) {
                $scope.createNewBoard();
              }

              break;
            case 'addNewColumn':
              if (data) {
                $scope.addNewColumn(data);
                $scope.newColumn = '';
              }

              break;
          }
        }
      };

      $scope.cleanImportData = function() {
        $scope.import.data = [];
        $scope.import.mapping = [];
        $scope.import.error = '';
      };

      /* globals Clipboard */
      new Clipboard('.import-btn');

      angular.element($window).bind('hashchange', function() {
        $scope.loading = true;
        $scope.userId = $window.location.hash.substring(1) || '';
        auth.logUser($scope.userId, getBoardAndMessages);
      });
    }
  ]);

'use strict';

angular.module('fireideaz').controller('MessageCtrl', [
  '$scope',
  '$window',
  'FirebaseService',
  'ModalService',
  'VoteService',
  function($scope, $window, firebaseService, modalService, voteService) {
    function mergeCardVotes(first, second) {
      voteService.mergeMessages($scope.userId, first, second);
    }
    $scope.modalService = modalService;
    $scope.userId = $window.location.hash.substring(1);

    $scope.dropCardOnCard = function(dragEl, dropEl) {
      if (dragEl !== dropEl) {
        $scope.dragEl = dragEl;
        $scope.dropEl = dropEl;

        modalService.openMergeCards($scope);
      }
    };

    $scope.dropped = function(dragEl, dropEl) {
      var drag = $('#' + dragEl);
      var drop = $('#' + dropEl);
      var firstCardId = drag.attr('messageId');
      var secondCardId = drop.attr('messageId');
      var firstCardReference = firebaseService.getMessageRef(
        $scope.userId,
        firstCardId
      );
      var secondCardReference = firebaseService.getMessageRef(
        $scope.userId,
        secondCardId
      );

      secondCardReference.once('value', function(firstCard) {
        firstCardReference.once('value', function(secondCard) {
          secondCardReference.update({
            text: firstCard.val().text + '\n' + secondCard.val().text,
            votes: firstCard.val().votes + secondCard.val().votes
          });

          mergeCardVotes(firstCardId, secondCardId);
          firstCardReference.remove();
          modalService.closeAll();
        });
      });
    };
  }
]);

'use strict';

angular
  .module('fireideaz')
  .service('Utils', [function () {
    function createUserId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    }

    var messageTypes = [{
      id: 1,
      value: 'Went well'
    }, {
      id: 2,
      value: 'To improve'
    }, {
      id: 3,
      value: 'Action items'
    }];

    function getNextId(board) {
      return board.columns.slice(-1).pop().id + 1;
    }

    function toObject(array) {
      var object = {};

      for (var i = 0; i < array.length; i++) {
        object[i] = {
          id: array[i].id,
          value: array[i].value
        };
      }

      return object;
    }

    function columnClass(id) {
      return 'column_' + (id % 6 || 6);
    }

    return {
      createUserId: createUserId,
      focusElement: focusElement,
      messageTypes: messageTypes,
      getNextId: getNextId,
      toObject: toObject,
      columnClass: columnClass
    };
  }]);

'use strict';

angular.module('fireideaz').directive('about', [function() {
    return {
      templateUrl : 'components/about.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('focus', function($timeout) {
    return function(scope, element) {
       scope.$watch('editing',
         function () {
            $timeout(function() {
                element[0].focus();
            }, 0, false);
         });
      };
});

'use strict';

angular.module('fireideaz').directive('boardContext', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/boardContext.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('dialogs', ['ImportExportService', function(importExportService) {
    return {
      restrict: 'E',
      templateUrl : 'components/dialogs.html',
      link: function($scope) {
        $scope.importExportService = importExportService;
      }
    };
  }]
);

'use strict';

angular
.module('fireideaz')
.directive('enterClick', function () {
  return {
    restrict: 'A',
    link: function (scope, elem) {
      elem.bind('keydown', function(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          event.preventDefault();
          $(elem[0]).find('button').focus();
          $(elem[0]).find('button').click();
        }
      });
    }
  };
});

'use strict';

angular.module('fireideaz').directive('pageHeader', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/header.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainContent', [function() {
    return {
      templateUrl : 'components/mainContent.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainPage', ['ModalService', function(modalService) {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('menu', ['VoteService', function(voteService) {
    return {
      templateUrl : 'components/menu.html',
      link: function($scope) {
        $scope.voteService = voteService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('sidebar', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/sidebar.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('spinner', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/spinner.html'
    };
  }]
);

'use strict';

angular
  .module('fireideaz')
  .service('APIService', [function () {
    return {
      test: function(){
        console.log("test")
        return true
      },
      createNewBoard: function({
        boardId: boardId,
        boardName: boardName,
        dateCreated: dateCreated,
        columns: columns,
        maxVotes: maxVotes,
        textEditingIsPrivate: textEditingIsPrivate
      }){
        console.log(`API Service: Creating a new board. Id: ${boardId}, Name: ${boardName}, DateCreate: ${dateCreated}, columns: ${columns}, maxVotes: ${maxVotes}`)
        return true;
      }
    };
  }]);

'use strict';

angular.module('fireideaz').service('CsvService', [
  function() {
    var csvService = {};

    var arrayExists = function(array) {
      return array !== undefined;
    };

    var isEmptyCell = function(nextValue) {
      return nextValue === undefined;
    };

    var isString = function(stringValue) {
      return typeof stringValue === 'string' || stringValue instanceof String;
    };

    var endodeForCsv = function(stringToEncode) {
      // Enocde " characters
      stringToEncode = stringToEncode.replace(/"/g, '""');

      // Surround string with " characters if " , or \n are present
      if (stringToEncode.search(/("|,|\n)/g) >= 0) {
        stringToEncode = '"' + stringToEncode + '"';
      }

      return stringToEncode;
    };

    csvService.buildCsvText = function(doubleArray) {
      var csvText = '';

      var longestColumn = csvService.determineLongestColumn(doubleArray);

      // Going by row because CSVs are ordered by rows
      for (var rowIndex = 0; rowIndex < longestColumn; rowIndex++) {
        for (var columnIndex = 0; columnIndex < longestColumn; columnIndex++) {
          var column = doubleArray[columnIndex];
          if (!arrayExists(column)) {
            break;
          }

          var nextValue = column[rowIndex];
          if (isEmptyCell(nextValue)) {
            nextValue = '';
          }

          if (isString(nextValue)) {
            nextValue = endodeForCsv(nextValue);
          }

          csvText += nextValue + ',';
        }

        csvText += '\r\n';
      }

      return csvText;
    };

    csvService.determineLongestColumn = function(doubleArray) {
      return doubleArray.reduce(function(prev, next) {
        return next.length > prev ? next.length : prev;
      }, doubleArray.length);
    };

    return csvService;
  }
]);

'use strict';

angular
  .module('fireideaz')
  .service('FirebaseService', ['firebase', '$firebaseArray', '$firebaseObject', function (firebase, $firebaseArray, $firebaseObject) {
    function newFirebaseArray(messagesRef) {
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      return firebase.database.ServerValue.TIMESTAMP;
    }

    function getMessagesRef(userId) {
      return firebase.database().ref('/messages/' + userId);
    }

    function getMessageRef(userId, messageId) {
      return firebase.database().ref('/messages/' + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return firebase.database().ref('/boards/' + userId);
    }

    function getBoardObjectRef(userId) {
      return $firebaseObject(firebase.database().ref('/boards/' + userId));
    }

    function getBoardColumns(userId) {
      return firebase.database().ref('/boards/' + userId + '/columns');
    }

    return {
      newFirebaseArray: newFirebaseArray,
      getServerTimestamp: getServerTimestamp,
      getMessagesRef: getMessagesRef,
      getMessageRef: getMessageRef,
      getBoardRef: getBoardRef,
      getBoardObjectRef: getBoardObjectRef,
      getBoardColumns: getBoardColumns
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .service('ImportExportService', 
          ['FirebaseService', 'ModalService', 'CsvService', '$filter', 
          function (firebaseService, modalService, CsvService, $filter) {
    var importExportService = {};

    importExportService.importMessages = function (userUid, importObject, messages) {
      var data = importObject.data;
      var mapping = importObject.mapping;

      for (var importIndex = 1; importIndex < data.length; importIndex++) {
        for (var mappingIndex = 0; mappingIndex < mapping.length; mappingIndex++) {
          var mapFrom = mapping[mappingIndex].mapFrom;
          var mapTo = mapping[mappingIndex].mapTo;

          if (mapFrom === -1) {
           continue;
         }

          var cardText = data[importIndex][mapFrom];

          if (cardText) {
             messages.$add({
             text: cardText,
             user_id: userUid,
             type: {
               id: mapTo
             },
             date: firebaseService.getServerTimestamp(),
             votes: 0});
          }
        }
      }

      modalService.closeAll();
    };

    importExportService.getSortFields = function(sortField) {
      return sortField === 'votes' ? ['-votes', 'date_created'] : 'date_created';
    };

    importExportService.getBoardText = function(board, messages, sortField) {
      if (board) {
        var clipboard = '';

        $(board.columns).each(function(index, column) {
          if (index === 0) {
            clipboard += '<strong>' + column.value + '</strong><br />';
          } else {
            clipboard += '<br /><strong>' + column.value + '</strong><br />';
          }

          var filteredArray = $filter('orderBy')(messages, importExportService.getSortFields(sortField));

          $(filteredArray).each(function(index2, message) {
            if (message.type.id === column.id) {
              clipboard += '- ' + message.text + ' (' + message.votes + ' votes) <br />';
            }
          });
        });

        return clipboard;
      }

      return '';
    };

    importExportService.getBoardPureText = function(board, messages, sortField) {
      if (board) {
        var clipboard = '';

        $(board.columns).each(function(index, column) {
          if (index === 0) {
            clipboard += column.value + '\n';
          } else {
            clipboard += '\n' + column.value + '\n';
          }

          var filteredArray = $filter('orderBy')(messages, importExportService.getSortFields(sortField));

          $(filteredArray).each(function(index2, message) {
            if (message.type.id === column.id) {
              clipboard += '- ' + message.text + ' (' + message.votes + ' votes) \n';
            }
          });
        });

        return clipboard;
      }

      return '';
    };

    importExportService.submitImportFile = function (file, importObject, board, scope) {
      importObject.mapping = [];
      importObject.data = [];

      if (file) {
        if (file.size === 0) {
          importObject.error = 'The file you are trying to import seems to be empty';
          return;
        }

        /* globals Papa */
        Papa.parse(file, {
          complete: function(results) {
            if (results.data.length > 0) {
              importObject.data = results.data;

              board.columns.forEach (function (column){
                importObject.mapping.push({ mapFrom: '-1', mapTo: column.id, name: column.value });
              });

              if (results.errors.length > 0) {
                 importObject.error = results.errors[0].message;
              }

              scope.$apply();
            }
          }
        });
      }
    };

    importExportService.generatePdf = function(board, messages, sortField) {
      /* globals jsPDF */
      var pdf = new jsPDF();
      var currentHeight = 10;

      $(board.columns).each(function(index, column) {
        if (currentHeight > pdf.internal.pageSize.height - 10) {
          pdf.addPage();
          currentHeight = 10;
        }

        pdf.setFontType('bold');
        currentHeight = currentHeight + 5;
        pdf.text(column.value, 10, currentHeight);
        currentHeight = currentHeight + 10;
        pdf.setFontType('normal');

        var filteredArray = $filter('orderBy')(messages, importExportService.getSortFields(sortField));

        $(filteredArray).each(function(index2, message) {
          if (message.type.id === column.id) {
            var parsedText = pdf.splitTextToSize('- ' + message.text + ' (' + message.votes + ' votes)', 180);
            var parsedHeight = pdf.getTextDimensions(parsedText).h;
            pdf.text(parsedText, 10, currentHeight);
            currentHeight = currentHeight + parsedHeight;

            if (currentHeight > pdf.internal.pageSize.height - 10) {
              pdf.addPage();
              currentHeight = 10;
            }
          }
        });
      });

      pdf.save(board.boardId + '.pdf');
    };

    var getColumnFieldObject = function(columnId) {
      return {
        type: {
          id: columnId
        }
      };
    };

    var showCsvFileDownload = function(csvText, fileName) {
      var blob = new Blob([csvText]);
      var downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(blob, {type: 'text/csv'});
      downloadLink.download = fileName;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    importExportService.generateCsv = function(board, messages, sortField) {

      var columns = board.columns.map(function(column) {
        // Updated to use column.id, as columns could be any number when changed.
        var columnMessages = $filter('filter')(messages, getColumnFieldObject(column.id));
        var sortedColumnMessages = $filter('orderBy')(columnMessages, importExportService.getSortFields(sortField));
        
        var messagesText = sortedColumnMessages.map(function(message) { 
          return message.text;
        });

        var columnArray = [column.value].concat(messagesText);

        return columnArray;
      });

      var csvText = CsvService.buildCsvText(columns);
      showCsvFileDownload(csvText, board.boardId + '.csv');
    };

    return importExportService;
  }]);

'use strict';

angular
  .module('fireideaz')
  .service('ModalService', ['ngDialog', function(ngDialog) {
    return {
      openAddNewColumn: function(scope) {
        ngDialog.open({
          template: 'addNewColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openAddNewBoard: function(scope) {
        ngDialog.open({
          template: 'addNewBoard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteCard: function(scope) {
        ngDialog.open({
          template: 'deleteCard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteColumn: function(scope) {
        ngDialog.open({
          template: 'deleteColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },

      openMergeCards: function(scope) {
        ngDialog.open({
          template: 'mergeCards',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
       openImportBoard: function(scope) {
        scope.cleanImportData();
        ngDialog.open({
          template: 'importCards',
          className: 'ngdialog-theme-plain bigDialog',
          scope: scope
        });
      },
      openDeleteBoard: function(scope) {
        ngDialog.open({
          template: 'deleteBoard',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      openDeleteCards: function(scope) {
        ngDialog.open({
          template: 'deleteCards',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      openVoteSettings: function(scope) {
        ngDialog.open({
          template: 'voteSettings',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openCardSettings: function(scope) {
        ngDialog.open({
          template: 'cardSettings',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      closeAll: function() {
        ngDialog.closeAll();
      }
    };
  }]);

'use strict';

angular
  .module('fireideaz')
  .service('VoteService', ['FirebaseService', function (firebaseService) {
    var voteService = {};

    voteService.getNumberOfVotesOnMessage = function(userId, messageId) {
      return new Array(this.returnNumberOfVotesOnMessage(userId, messageId));
    };

    voteService.returnNumberOfVotesOnMessage = function(userId, messageKey) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      return userVotes[messageKey] ? userVotes[messageKey] : 0;
    };

    voteService.returnNumberOfVotes = function(userId, messagesIds) {
      var userVotes = localStorage.getItem(userId) ? JSON.parse(localStorage.getItem(userId)) : {};

      var totalVotes = Object.keys(userVotes).map(function(messageKey) {
        return messagesIds.indexOf(messageKey) >= 0 ? userVotes[messageKey] : 0;
      }).reduce(function (a, b) {
        return a + b;
      }, 0);

      return localStorage.getItem(userId) ? totalVotes : 0;
    };

    voteService.extractMessageIds = function(messages) {
      return messages ? messages.map(function(message) { return message.$id; }) : [];
    };

    voteService.remainingVotes = function(userId, maxVotes, messages) {
      var messagesIds = voteService.extractMessageIds(messages);

      return (maxVotes - voteService.returnNumberOfVotes(userId, messagesIds)) > 0 ?
        maxVotes - voteService.returnNumberOfVotes(userId, messagesIds) : 0;
    };

    voteService.increaseMessageVotes = function(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey]) {
          boardVotes[messageKey] = parseInt(boardVotes[messageKey] + 1);
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        } else {
          boardVotes[messageKey] = 1;
          localStorage.setItem(userId, JSON.stringify(boardVotes));
        }
      } else {
        var newObject = {};
        newObject[messageKey] = 1;
        localStorage.setItem(userId, JSON.stringify(newObject));
      }
    };

    voteService.decreaseMessageVotes = function(userId, messageKey) {
      if (localStorage.getItem(userId)) {
        var boardVotes = JSON.parse(localStorage.getItem(userId));

        if (boardVotes[messageKey] <= 1) {
            delete boardVotes[messageKey];
        } else {
          boardVotes[messageKey] = boardVotes[messageKey] - 1;
        }

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    };

    voteService.mergeMessages = function(userId, dragMessage, dropMessage) {
      var dragMessageVoteCount = voteService.returnNumberOfVotesOnMessage(userId, dragMessage);
      var dropMessageVoteCount = voteService.returnNumberOfVotesOnMessage(userId, dropMessage);
      var boardVotes = JSON.parse(localStorage.getItem(userId));

      if(dragMessageVoteCount > 0) {
        boardVotes[dropMessage] = dragMessageVoteCount + dropMessageVoteCount;
        delete boardVotes[dragMessage];

        localStorage.setItem(userId, JSON.stringify(boardVotes));
      }
    };

    voteService.canUnvoteMessage = function(userId, messageKey) {
      return localStorage.getItem(userId) && JSON.parse(localStorage.getItem(userId))[messageKey] ? true : false;
    };

    voteService.isAbleToVote = function(userId, maxVotes, messages) {
      return voteService.remainingVotes(userId, maxVotes, messages) > 0;
    };

    voteService.incrementMaxVotes = function(userId, maxVotes) {
      var boardRef = firebaseService.getBoardRef(userId);

      if (maxVotes < 99) {
        boardRef.update({
          max_votes: maxVotes + 1
        });
      }
    };

    voteService.decrementMaxVotes = function(userId, maxVotes) {
      var boardRef = firebaseService.getBoardRef(userId);

      boardRef.update({
        max_votes: Math.min(Math.max(maxVotes - 1, 1), 100)
      });
    };

    voteService.vote = function(userId, maxVotes, messages, messageKey, votes) {
      if (voteService.isAbleToVote(userId, maxVotes, messages)) {
        var messagesRef = firebaseService.getMessagesRef(userId);

        messagesRef.child(messageKey).update({
          votes: votes + 1,
          date: firebaseService.getServerTimestamp()
        });

        this.increaseMessageVotes(userId, messageKey);
      }
    };

    voteService.unvote = function(userId, messageKey, votes) {
      if(voteService.canUnvoteMessage(userId, messageKey)) {
        var messagesRef = firebaseService.getMessagesRef(userId);
        var newVotes = (votes >= 1) ? votes - 1 : 0;

        messagesRef.child(messageKey).update({
          votes: newVotes,
          date: firebaseService.getServerTimestamp()
        });

        voteService.decreaseMessageVotes(userId, messageKey);
      }
    };

    voteService.hideVote = function(userId, hideVote) {
      var boardRef = firebaseService.getBoardRef(userId);
      boardRef.update({
        hide_vote: hideVote
      });
    };

    return voteService;
  }]);
