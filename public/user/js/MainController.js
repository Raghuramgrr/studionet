angular.module('studionet')

.controller('MainController', ['$scope', '$stateParams', '$rootScope', '$uibModal',
                               'GraphService', 'users', 'profile', 'supernode', 'links', 'groups',
                               function($scope, $stateParams, $rootScope, $uibModal, GraphService, users, profile, supernode, links, groups){

  $scope.dockmode = true;
  $scope.usersHash = users.usersHash;

  // --------------- socket connection message handling
  socket.on('node_created', function (node) {
      node.type = node.contentType;
      GraphService.addNewNode(node);
      showMessage("A new node was created by " + (users.usersHash[node.createdBy].nickname ? users.usersHash[node.createdBy].nickname : users.usersHash[node.createdBy].name) );
  });

  socket.on('group_created', function (group) {
    showMessage("A new group was created", group);
    groups.groups.push(group);
  });

  socket.on('edge_created', function (edge) {
    showMessage("A new link was created");

    edge._id = edge.id;
    delete edge.id;

    GraphService.addNewEdge(edge);
  });

  socket.on('edge_deleted', function (edge_id) {
     showMessage("A link was deleted");
     GraphService.removeEdge(edge_id);
  });

  socket.on('node_updated', function (node) {
    setTimeout( function(){ GraphService.getNode(node, true) } , 2000 );
  });

  socket.on('node_deleted', function (node) {
     GraphService.removeNode(node);
  });


  socket.on('node_rated', function (data) {

    // update the graph colors
    $scope.graph.getElementById(data.id).data('rating',  data.rating);
    $scope.graph.getElementById(data.id).data('rateCount',  data.rateCount);
    $scope.graph.getElementById(data.id).data('totalRatings',  data.totalRatings);

    profile.getActivity();

  });

  socket.on('node_viewed', function (data) {
    
    $scope.graph.getElementById(data.id).flashClass('glow', 500)
    for(i = 0; i < 30; i++){
      setTimeout(function(){
        $scope.graph.getElementById(data.id).flashClass('glow', 500)
      }, 1000*i)
    
    }

    profile.getActivity();

  });


  // -------------- constants and declarations
  var updateUserProfile = function(){
    $scope.me = profile.user;
    $scope.level = Math.floor(profile.user.level);
    $scope.value = (profile.user.level -  $scope.level)*100;
  };
  profile.registerObserverCallback(updateUserProfile);
  updateUserProfile();


  $scope.showHelp = function(){
    showDetailsModal( GraphService.graph.getElementById("560") ); // fix later
  }

  // ----- quick finds
  $scope.qfs = [    
                    { 'name': "None", 'id': 0},
                    { 'name': "My Nodes", 'id': 1},
                    { 'name': "My Comments", 'id': 2},
                    { 'name': "Mention Me", 'id': 3},
                    { 'name': "Questions", 'id': 4}, 
                    { 'name': "Latest", 'id': 5}
                ];
  $scope.quickfind = $scope.qfs[0];
  $scope.highlight = function(id){
    $scope.quickfind = $scope.qfs[id];
    GraphService.graph.nodes().removeClass('marked');
    switch(id){
      case 0: 
        break;
      case 1: 
        $scope.quickFindMatches = GraphService.graph.nodes("[createdBy="+$scope.me.id +"]").addClass('marked');
        //GraphService.comments("[createdBy="+$scope.me.id +"]").map(function(c){ GraphService.graph.getElementById(c.data('ref')).addClass('marked') });
        break;
      case 3: 
        GraphService.markMentions().success(function(data){
          $scope.quickFindMatches = data;
        });
        break;
      case 4: 
        GraphService.markQuestions().success(function(data){
          $scope.quickFindMatches = data;
        });
        break; 
      case 5: 
        // highlight last 5 hours
        var now = new Date();
        now = now.getTime();
        before = now - 12*60*60*1000;
        $scope.quickFindMatches = GraphService.graph.nodes("[dateCreated>" + before +"]").addClass('marked');
        break; 
      case 2: 
        $scope.quickFindMatches = GraphService.markComments($scope.me.id);
        break;
    }

    GraphService.graph.fit($scope.quickFindMatches);

    if(window["ga"] == undefined){
      console.log("ga is not defined");
    }
    else{
      ga("send", "event", "action", "quick-find" + $scope.qfs[id].name, "/graph");
    }

  };



  // ---- layouts

  $scope.layouts = [{ 'name': "Spiral", 'id': 0}, 
                    { 'name': "By Date", 'id': 1}, 
                    { 'name': "By Author", 'id': 2},
                    { 'name': "Staggered", 'id': 3}]
  $scope.currentLayout = 0;
  $scope.switchLayout = function(id){
    $scope.currentLayout = id;
    GraphService.draw_graph(null,  $scope.currentLayout );
    if(window["ga"] == undefined){
      console.log("ga is not defined");
    }
    else{
      ga("send", "event", "action", "change-layout" + $scope.layouts[id].name, "/graph");
    }
  }

  // ---- Displays message in the message-container
  // todo: remove message id reference
  var showMessage = function(msg){

      $scope.message = msg;

      for(i=0;i<5;i++) {
        $('#message').fadeTo('slow', 0.5).fadeTo('slow', 1.0);
      }

      setTimeout(function(){
        $scope.message = "";
        $scope.$apply();
      }, 7000)
  
  }

  $scope.track = function(activity){
    if(window["ga"] == undefined){
      console.log("ga is not defined");
    }
    else{
      ga("send", "event", "pop up", activity, "/user");
    }
  }

  // ----------------- Graphs
  var graph_container = angular.element('#cy')[0];
  $scope.linkMode = undefined;
  // First Initialization of the graph on page-refresh
  var nodeClearTimeout;
  var t;
  $scope.selectMode = false;
  $scope.graphInit = function(){  
      var graphObject = {
        threshold : 5, 
        onMouseOver: function(evt){


                      if(evt.cyTarget.isNode && evt.cyTarget.isNode()){
                          if(evt.cyTarget.id() =='ghost'){
                            //console.log(evt.cyTarget.id());
                          }
                          if($scope.selectMode == true && evt.cyTarget.hasClass('faded'))
                            return;
                          else{

                              if(nodeClearTimeout != undefined){
                                clearTimeout(nodeClearTimeout);   
                                nodeClearTimeout = undefined;
                              }

                              if($scope.nodeInfo != undefined){
                                GraphService.graph.nodes().removeClass('hover');
                                evt.cyTarget.addClass('hover');

                                $scope.nodeInfo = evt.cyTarget.data();
                                $scope.nodeInfo.incomers = evt.cyTarget.incomers().length;
                                $scope.nodeInfo.outgoers = evt.cyTarget.outgoers().length;
                                $scope.nodeInfo.comments = GraphService.getCommentCount(evt.cyTarget.id());
                                $scope.nodeInfo.refTitle = $scope.graph.getElementById( $scope.nodeInfo.ref ).data('title')
                                $scope.$apply();
                              }
                              else{
                                
                                if(t != undefined)
                                  return;

                                t = setTimeout(function(){
                                  GraphService.graph.nodes().removeClass('hover');
                                  evt.cyTarget.addClass('hover');

                                  $scope.nodeInfo = evt.cyTarget.data();
                                  $scope.nodeInfo.incomers = evt.cyTarget.incomers().length;
                                  $scope.nodeInfo.outgoers = evt.cyTarget.outgoers().length;
                                  $scope.nodeInfo.comments = GraphService.getCommentCount(evt.cyTarget.id());
                                  $scope.nodeInfo.refTitle = $scope.graph.getElementById( $scope.nodeInfo.ref ).data('title')
                                  $scope.$apply();
                                }, 300);
                              }
                          }


                      }
                      else{
                            if(t !== undefined ){
                              clearTimeout(t);
                              t = undefined;
                            }

                            if($scope.nodeInfo != undefined && nodeClearTimeout == undefined && $scope.selectMode == false){
                              GraphService.graph.nodes().removeClass('hover');

                              nodeClearTimeout = setTimeout( function(){
                                      $scope.nodeInfo = undefined;
                                      $scope.$apply();
                                      console.log("cleared!");
                                    }, 300);
                            }
                      }
                  },
        onEdgeSingleClick: function(evt){
              //console.log("Edge clicked", evt.cyTarget.data());
        }, 
        onEdgeDoubleClick: function(evt){
              $rootScope.$broadcast("VIEW_EDGE_MODAL", { edge: evt.cyTarget });
        }, 
        onCanvasClick: function(){ 
                  GraphService.removeAdditionalStyles();
                  $scope.selectMode = false;
        },
        onTapHold : function(evt){ 

                          var node = evt.cyTarget;

                          if(node.isNode && node.isNode() && node.id() != 'ghost'){

                              //node.ungrabify(); 

                              if($scope.linkMode != undefined){
                                  if( node.id() != $scope.linkMode.id() ){
                                    $rootScope.$broadcast("CREATE_EDGE_MODAL", { src: $scope.linkMode.data(), target: node.data() });
                                    $scope.linkMode = undefined; 
                                    $scope.graph.remove('#ghost');

                                    $('#cy').unbind('mousemove')
                                  }
                                  else
                                    showMessage("Cannot connect to the same node!");
                              }
                              else{
                                  
                                  $scope.linkMode = node;

                                  //node.ungrabify(); 
                                  
                                  $scope.graph.add({group: "nodes",    data: { id: 'ghost'},   position: { x: window.innerWidth/2,  y : window.innerHeight/2 }});
                                  $scope.graph.add({group: "edges",    data: { id: 'ghost-edge', source: node.id(), target: 'ghost'  } });



                                  $scope.graph.getElementById('ghost').css({ 'border-style': 'dashed', 'z-index' : 0, 'width': 1, 'height':1, 'shape': 'ellipse' })
                                  $scope.graph.getElementById('ghost-edge').addClass('secondary-link');

                                  $( "#cy" ).mousemove(function( event ) {
                                      $scope.graph.getElementById('ghost').renderedPosition({ x: event.pageX+10, y: event.pageY+10 });
                                  });

                                  showMessage("Entered linking mode");

                                
                              }
                          }
                          else{

                            if($scope.linkMode !== undefined){
                              $scope.linkMode = undefined; 
                              $scope.graph.remove('#ghost');

                              $('#cy').unbind('mousemove');

                              showMessage("Escaped linking mode");   
                            }
                          }



                        },
        onNodeSingleClick: function(evt){ 
                                if(evt.cyTarget.id() == 'ghost'){
                                  graphObject.onCanvasClick();
                                  return;
                                }

                                $scope.nodeInfo = evt.cyTarget.data();
                                $scope.nodeInfo.incomers = evt.cyTarget.incomers().length;
                                $scope.nodeInfo.outgoers = evt.cyTarget.outgoers().length;
                                $scope.nodeInfo.comments = GraphService.getCommentCount(evt.cyTarget.id());
                                $scope.nodeInfo.refTitle = $scope.graph.getElementById( $scope.nodeInfo.ref ).data('title')
                                $scope.$apply();

                                GraphService.selectNode(evt.cyTarget.id());
                                $scope.selectMode = true;
                          },
        onNodeDoubleClick : function(evt){
                                  var node = evt.cyTarget;

                                  if(node.id() !='ghost'){
                                      $scope.graph.elements().removeClass('highlighted');
                                      showDetailsModal( node );
                                  }
                                  else{
                                    console.log("ghost double clicked");
                                  }


                            }
      }

      GraphService.getGraph( graph_container, graphObject );  
  }


  // ------------- Zooming & Nav Controls
  //$scope.zoomLevel = "Calibrating...";
  var updateZoom = function(){
    if($scope.graph){
      /*$scope.zoomLevel = (100*$scope.graph.zoom()).toPrecision(4);
      $scope.$apply();*/
      $('#zoom').html('<b>Z:</b> ' + (100*$scope.graph.zoom()).toPrecision(4) + ' %');
    }
  }
  setTimeout(updateZoom, 1000);
  graph_container.addEventListener("wheel", updateZoom);

  $scope.resetGraph = function(){  GraphService.graph.fit();  }


  // Highlight any state params
  var highlightStateParams = function(){

      // highlight node, if any in route params
      if($stateParams.contributionId && $scope.graph.getElementById( $stateParams.contributionId ) ){

        var node = $scope.graph.getElementById( $stateParams.contributionId)
        GraphService.selectNodePermanent( node );

        // fit the graph
        $scope.graph.fit( '#' + node.id() )

      }
  }

  var showQTip = function(evt){

      var node = evt.cyTarget;

      var data = node.data();

      var qtipFormat = STUDIONET.GRAPH.qtipFormat(evt);

      var auth = users.getUser( node.data('createdBy'), false );
      
      qtipFormat.id = "qTip-" +  node.id();
      qtipFormat.content.text =  node.data('title') + "<br>- " + ( (auth.nickname !=null && auth.nickname.length) ? auth.nickname : auth.name)

      $scope.nodeInfo = true;
      //node.qtip(qtipFormat, evt);  

  }


  // Observe the Graph Service for Changes and register observer
  var updateGraph = function(){
      $scope.graph = GraphService.graph;
      highlightStateParams();
      for(var i=0; i < profile.activity.length; i++ ){
        if(profile.activity[i].type == "VIEWED" || profile.activity[i].type == "CREATED")
          $scope.graph.getElementById(profile.activity[i].end).addClass('read');

      }
  };
  GraphService.registerObserverCallback(updateGraph);


  // ---------------- Filters
  $scope.filters = [];
  $scope.matchingNodes = [];

  // when message received
  $scope.$on( BROADCAST_MESSAGE, function(event, args) {
      showMessage(args.message);
  });

  // when filter is active
  $scope.$on( BROADCAST_FILTER_ACTIVE, function(event, args) {
      $scope.matchingNodes = args.nodes;
      $scope.filters = args.data;
      $scope.quickfind = $scope.qfs[0];
  });

  // when filter is cleared
  $scope.$on( BROADCAST_CLEAR_ALL_FILTERS, function(event, args) {
      $scope.matchingNodes = [];
      $scope.filters = [];
  });

  $scope.clearFilter = function(code, optional_value){
    $rootScope.$broadcast(BROADCAST_CLEAR_FILTER, { 'code': code, 'value': optional_value });
  }

  $scope.searchNode = function(){
    // search node for search term
    console.log($scope.searchTerm);
    $scope.searchTermActive = true;
  }

  // ------- Modals
  // View Modal
  $scope.viewMode = false;
  $scope.$on( BROADCAST_VIEWMODE_OFF, function(event, args) {
    $scope.viewMode = false;
  });

  var showDetailsModal = function(data) {
      $scope.track("view-node");
      $('#contributionViewModal').modal({backdrop: 'static', keyboard: false});
      $rootScope.$broadcast("VIEWMODE_ACTIVE", {data: data});
      $scope.viewMode = true;
  };

  $scope.$on( "SHOW_DETAILS_MODAL", function(event, args) {
      showDetailsModal(args.data);
  });


  // profile modal
  $scope.showProfile = function(){
      $('#profileModal').modal({backdrop: 'static', keyboard: false});
      $rootScope.$broadcast( "PROFILE_MODE",  {id: $scope.me.id});
  }




}])

