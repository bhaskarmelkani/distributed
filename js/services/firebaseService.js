'use strict';

angular
  .module('fireideaz')
  .service('FirebaseService', ['firebase', '$firebaseArray', '$firebaseObject', function (firebase, $firebaseArray, $firebaseObject) {
    function newFirebaseArray(messagesRef) {
      console.log("newFirebaseArray")
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      console.log("getServerTimestamp")
      const val = firebase.database.ServerValue.TIMESTAMP;
      console.log(val);
      return val;
    }

    function getMessagesRef(userId) {
      console.log("getMessagesRef")
      const val = firebase.database().ref('/messages/' + userId);
      console.log(val);
      return val;
    }

    function getMessageRef(userId, messageId) {
      console.log("getMessageRef")
      const val = firebase.database().ref('/messages/' + userId + '/' + messageId);
      console.log(val);
      return val;
    }

    function getBoardRef(userId) {
      console.log("getBoardRef")
      const val = firebase.database().ref('/boards/' + userId);
      console.log(val);
      return val;
    }

    function getBoardObjectRef(userId) {
      console.log("getBoardObjectRef")
      const val = $firebaseObject(firebase.database().ref('/boards/' + userId));
      console.log(val);
      return val;
    }

    function getBoardColumns(userId) {
      console.log("getBoardColumns")
      const val = firebase.database().ref('/boards/' + userId + '/columns');
      console.log(val);
      return val;
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
