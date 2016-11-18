angular.module('studionet')

.controller('UserCtrl', ['$scope', 'profile', function($scope, profile){
	$scope.user = profile.user;
	$scope.modules = profile.modules;

	
}])

.controller('ProfileCtrl', ['$scope', 'profile', '$http', function($scope, profile, $http){

	/*
	 *	Functionality for User Profile Page
	 */
	
	$scope.uploadPic = function(avatar) {
	    avatar.upload = Upload.upload({
	      url: '/uploads/avatar',
	      data: {username: $scope.username, avatar: avatar},
	    });

	    avatar.upload.then(function (response) {
	      $timeout(function () {
	        avatar.result = response.data;

	         // force a reload for avatar
		      var random = (new Date()).toString();
		      profile.getUser().then(function(){
			      $scope.user.avatar = $scope.user.avatar + "?cb=" + random;
			    });
	      });
	    }, function (response) {
	      if (response.status > 0)
	        $scope.errorMsg = response.status + ': ' + response.data;
	    }, function (evt) {
	      // Math.min is to fix IE which reports 200% sometimes
	      avatar.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
	    });
   	}

  	$scope.uploadModel = function(model){
	    model.upload = Upload.upload({
	      url: '/uploads/models',
	      data: {username: $scope.username, model: model},
	    });

    	model.upload.then(function (response) {
		      $timeout(function () {
		        model.result = response.data;
		      });
		    }, function (response) {
		      if (response.status > 0)
		        $scope.errorMsg = response.status + ': ' + response.data;
		    }, function (evt) {
		      // Math.min is to fix IE which reports 200% sometimes
		      model.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
		    });
  	};

  	$scope.changeName = function($event){
  		
  		if($event.keyCode==13){

  			$http({
				  method  : 'PUT',
				  url     : '/api/profile/',
				  data    : $scope.user,  // pass in data as strings
				  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
				 })
				.success(function(data) {
				    
					alert("Name updated");    

				})
  		}
  	}
	  




}])

/*
 *	Controller for Groups
 * 
 */
.controller('GroupsCtrl', ['$scope', 'profile', '$http', function($scope, profile, $http){


	$scope.user = profile.user;
	$scope.modules = profile.modules;

	// Initial no group
	$scope.groups = [
		{
			'name': 'None',
			'id': -1
		}

	]


	refresh();
	function refresh(){

		$scope.groups = [		{
			'name': 'None',
			'id': -1
		}];
		$scope.users = [];

		/** better solution to get data this way from server */
		// get general list of groups
		$http.get('/api/groups/').success(function(data){
			$scope.groups = $scope.groups.concat(data);

			// append data from user modules
			for(var mod=0; mod < $scope.modules.length; mod++){
				for(var g=0; g < $scope.groups.length; g++ ){
					if($scope.modules[mod].id == $scope.groups[g].id){
						// assign role
						$scope.groups[g].role =  $scope.modules[mod].role;
					}
				}
			}

			console.log($scope.groups);
		});

		$http.get('/api/users/').success(function(data){
			$scope.users = data;
		});		
	}


	$scope.displayError = false;
	$scope.displaySuccess = false;
	
	$scope.users = undefined;

	$scope.activeGroup = {

			'name' : "",
			'description' : "",
			'restricted': false,
			'groupParentId': "" 

		};


	/*** Viewing ***/
	$scope.viewGroup = function(group){
		$scope.activeGroup = group;
		
		/*
		 * Details of the group
		 */
		console.log('/api/groups/' + $scope.activeGroup.id);
		$http({
		  method  : 'GET',
		  url     : '/api/groups/' + $scope.activeGroup.id,
		 })
		.success(function(data) {
			    
		    if (data == undefined) {
				console.log("Error fetching Group Data")
		    } else {

		    	//console.log(data, data);
				// Add additional data    
				data.role = $scope.activeGroup.role;
				$scope.activeGroup = data;
		    }

		  })


	}

	$scope.joinGroup = function(){

	}

	$scope.editGroup = function(group){
		$scope.activeGroup = group;
	}


	/*** Creating ***/
	$scope.createGroup = function(){
		
		$scope.activeGroup = {

			'name' : "",
			'description' : "",
			'restricted': false,
			'groupParentId': "-1",
		};
	}

	$scope.toggleRestricted = function(){
		$scope.activeGroup.restricted = !$scope.activeGroup.restricted;
	}


	/** Saving Group ***/
	$scope.saveGroup = function(){

		// Convert Group Parent Id to Integer
		$scope.activeGroup.groupParentId = parseInt($scope.activeGroup.groupParentId);
		console.log($scope.activeGroup);

		
		
		$http({
		  method  : 'POST',
		  url     : '/api/groups/',
		  data    : $scope.activeGroup,  // pass in data as strings
		  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
		 })
		.success(function(data) {
		    
		    if (!data.success) {
		      // if not successful, bind errors to error variables
		      //$scope.errorName = data.errors.name;
		      //$scope.errorSuperhero = data.errors.superheroAlias;
		    } else {
		      // if successful, bind success message to message
		      //$scope.message = data.message;
		    }

		  })	 

		refresh();

	}

	/*** Editing Group ***/
	$scope.saveGroupEdit = function(){

		console.log($scope.activeGroup);
		
		$http({
		  method  : 'PUT',
		  url     : '/api/groups/' + $scope.activeGroup.id,
		  data    : $scope.activeGroup,  // pass in data as strings
		  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
		 })
		.success(function(data) {
		    
		    console.log("data", data);

		    if (!data.success) {


		      // if not successful, bind errors to error variables
		      //$scope.errorName = data.errors.name;
		      //$scope.errorSuperhero = data.errors.superheroAlias;
		    } else {
		      // if successful, bind success message to message
		      //$scope.message = data.message;
		    }

		  })	

	}


	/*** Adding User *****/
	$scope.groupUsers = [];
	$scope.addUserModal = function(group){
		$scope.groupUsers = []
		$scope.activeGroup = group;
		$scope.users = [];
		console.log($scope.activeGroup);
		console.log('/api/groups/' + $scope.activeGroup.id + '/users');

		$http.get('/api/users/').success(function(data){

			$http.get('/api/groups/' + $scope.activeGroup.id + '/users').success(function(subdata){
				
				$scope.groupUsers = subdata;

				// attach role with this group to the users
				for(var i=0; i<subdata.length; i++){

					for(j=0; j < data.length; j++){

						if(subdata[i].id == data[j].id){
							data[j].status = "Yes";
						}
						else{
							data[j].status = "No";
						}
					}
				}
					
				$scope.users = data;

			});	
		});		
	}


	$scope.addUser = function(user){

		var data = {
			'userId': user.id,
			'groupId': $scope.activeGroup.id,
			'groupRole': 'Member'

		}


		if(user.status == "No"){

			// add users in $scope.groupUsers 
			// POST /api/groups/:groupId/users/
			$http({
			  method  : 'POST',
			  url     : '/api/groups/' + $scope.activeGroup.id +'/users/',
			  data    : data,  // pass in data as strings
			  headers : { 'Content-Type': 'application/json' }  // set the headers so angular passing info as form data (not request payload)
			 })
			.success(function(data) {
			    
			    if(data){
			    	user.status = "Yes"
			    }

			  })				
		}
		else{
			// remove user from group
			user.status = "No";
		}
		

	}



}])


/*
 *
 *	Controller for Graph View
 *	
 * 
 */

.controller('UserGraphCtrl', ['$scope', 'profile', '$http', function($scope, profile, $http){


	$scope.user = profile.user;
	$scope.modules = profile.modules;

	/*
	 *  Cytoscape Styles
	 */
	var MODULE_SHAPE = "rectangle";
	var USER_SHAPE = "ellipse"
	var CONTRIBUTION_SHAPE = "rectangle"

	var MODULE_WIDTH = 15, MODULE_HEIGHT = 15;
	var USER_WIDTH = 20, USER_HEIGHT = 20; 
	var CONTRIBUTION_WIDTH = 15, CONTRIBUTION_HEIGHT = 15;

	var MODULE_COLOR = "#FB95AF";
	var USER_COLOR = "#DE9BF9";
	var CONTRIBUTION_COLOR = "#FFD86E";

	var EDGE_DEFAULT_COLOR = "#ccc";
	var EDGE_SELECTED_COLOR = "blue";
	var EDGE_DEFAULT_STRENGTH = 3;
	var EDGE_DEFAULT_WEIGHT = 3;

	var GRID_GRAPH_LAYOUT = { name : 'grid' };
	var DAGRE_GRAPH_LAYOUT = { name : 'dagre' };
	var CIRCLE_GRAPH_LAYOUT = { name : 'circle' };
	var COSE_GRAPH_LAYOUT = { name: 'cose',
	                          padding: 10,
	                          randomize: true };

	var CONCENTRIC_GRAPH_LAYOUT = {  name: 'concentric', 
	        concentric: function( node ){
	          return node.degree();
	        },
	        levelWidth: function( nodes ){
	          return 1;
	        }};

	/*
	 * Cytoscape Specific Styles
	 */
	var graph_style = {
	      
	      container: document.getElementById('cy'),

	      ready: function(){
	                          window.cy = this;

	                          //giddy up
	                        },
	      
	      layout: CONCENTRIC_GRAPH_LAYOUT,
	      
	      hideLabelsOnViewport: false,
	      
	      style: 
	        cytoscape.stylesheet()
	          
	          .selector('node')
	            .css({
	              'shape': 'data(faveShape)',
	              'width': 'data(width)', 
	              'height': 'data(height)',   // mapData(property, a, b, c, d)  => specified range a, b; actual values c, d
	              'text-valign': 'center',
	              'font-size':'15%',
	              'background-color': 'data(faveColor)',
	              'border-color': 'data(faveColor)'
	              //'background-image': 'data(icon)',
	              //'background-width': 'data(width)',
	              //'background-height': 'data(height)'
	            })
	           
	          .selector(':selected')
	            .css({
	              'border-width': 0.5,
	              'border-color': '#333',
	              'width': 'data(width) + 10', 
	              'height': 'data(height) + 10',
	              'font-size': '15%'
	            })
	          
	          .selector('edge')
	            .css({
	              'curve-style': 'bezier',
	              'width': 'mapData(weight, 0.1, 3, 1, 7)', 
	              'target-arrow-shape': 'triangle',
	              'line-color': 'data(faveColor)',
	              'source-arrow-color': 'data(faveColor)',
	              'content' : 'data(label)',
	              'font-size':'15%',
	              'color': '#d8d8d8',
	              'edge-text-rotation': 'autorotate',
	              'target-arrow-color': 'data(faveColor)'
	            })
	            
	          
	          .selector('.faded')
	            .css({
	              'opacity': 0.75,
	              'text-opacity': 0.25
	            })
	          
	          .selector('.highlighted')
	            .css({
	              'line-color': 'green',
	              'target-arrow-color':'green',
	              'background-color': 'data(faveColor)'
	            })

	}

	/*
	 * Converts normal node from backend into cytoscape-specific format
	 */
	var createGraphNode = function(node){

	    var data = node;
	    
	    var id = angular.element($('.graph-container')).scope().user.id;
	    //console.log( id);
	    if(node.type=="module"){
	          node.faveShape = MODULE_SHAPE;
	          node.faveColor = MODULE_COLOR;
	          node.width = MODULE_WIDTH;
	          node.height = MODULE_HEIGHT;
	          node.icon = 'url(./img/module1.png)'//'url(../../img/worldwide.svg)';
	    }
	    else if(node.type=="user"){ 
	          node.faveShape = USER_SHAPE;
	          node.faveColor = USER_COLOR;
	          node.width = USER_WIDTH;
	          node.height = USER_HEIGHT;
	          
	          if(node.id == id){
	            node.icon = 'url(https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcQiILryEowDWzJ29q0LwIZ6jwddVyfT0Tn1Dp0lIRI4Vuwhy4u3kg)'
	          }
	          else{
	             // logged in user image - sakshi
	            node.icon = 'url(./img/user-icon.jpg)';
	          }
	    }
	    else if(node.type=="contribution"){
	          node.faveShape = CONTRIBUTION_SHAPE;
	          node.faveColor = CONTRIBUTION_COLOR;
	          node.width = CONTRIBUTION_WIDTH;
	          node.height = CONTRIBUTION_HEIGHT;
	          node.icon = 'url(./img/contribution.png)' //'url(../../img/zoom-in.svg/)';
	          return;
	    }
	    else {
	          node.faveShape = CONTRIBUTION_SHAPE;
	          node.faveColor = CONTRIBUTION_COLOR;
	          node.width = CONTRIBUTION_WIDTH;
	          node.height = CONTRIBUTION_HEIGHT;
	          node.icon = 'url()' //'url(../../img/zoom-in.svg/)';
	          return;
	    }
	   

	    return  { data: node };
	}

	/*
	 * Converts normal edge from backend into cytoscape-specific format
	 */
	var createGraphEdge = function(edge){

	    edge.strength = EDGE_DEFAULT_STRENGTH;
	    edge.faveColor = EDGE_DEFAULT_COLOR;
	    edge.weigth = EDGE_DEFAULT_WEIGHT;

	    return { data: edge };

	}

	/*
	 * Composes the hover-box according to node type
	 */
	var createHoverBox = function( node, extra ){
	    
	    var html_content = $('<div></div>').addClass(node.type);
	    
	    var heading = $('<div></div>').addClass('heading').html(node.id + " " + (node.name || extra.name));
	    html_content.append(heading);

	    var statsContainer = $('<div></div>').addClass('stats-container');

	    

	    if(node.type == "module"){
	      var stat1 = $('<div></div>').addClass('stats').html('Users <br> 243');
	      statsContainer.append(stat1);
	      var stat2 = $('<div></div>').addClass('stats').html('Contributions <br> 10');
	      statsContainer.append(stat2);
	    }
	    else if(node.type == "user"){
	      var stat1 = $('<div></div>').addClass('stats').html('Last Active <br> 24-1-2017');
	      statsContainer.append(stat1);
	      var stat2 = $('<div></div>').addClass('stats').html('Contributions <br> 10');
	      statsContainer.append(stat2);
	    }
	    else if(node.type == "contribution"){
	      var stat1 = $('<div></div>').addClass('stats').html('Views <br> 243');
	      statsContainer.append(stat1);
	      var stat2 = $('<div></div>').addClass('stats').html('Likes <br> 10');
	      statsContainer.append(stat2);
	      var stat3 = $('<div></div>').addClass('stats').html('Links <br> 45');
	      statsContainer.append(stat3);
	    }

	    html_content.append(statsContainer);
	    return html_content;

	}

	/*
	 * Makes the actual graph and defines functionality on the nodes and edges
	 */
	var makeGraph = function(dNodes, dEdges){

	    console.log("Making Graph");

	    // if cytoscape canvas is defined, assign that
	    if(arguments[2] != undefined)
	      graph_style.container = document.getElementById(arguments[2]);
	    console.log(arguments);

	    graph_style.elements = {
	        nodes: dNodes.map( function(node){ return createGraphNode(node) } ), 
	        edges: dEdges.map( function(edge){ return createGraphEdge(edge) } )
	    }

	    graph_style.layout = eval($("input[name='layout-radio']:checked").val());
	    console.log($("input[name='layout-radio']:checked").val());

	    cy = cytoscape( graph_style );

	    // To fix user node at center - sakshi
	    var id = angular.element($('.graph-container')).scope().user.id;
	    
	    var winWidth = window.innerWidth/2;
	    var winHeight = window.innerHeight/2;
	    console.log("here:" +winWidth+" "+winHeight);
	    cy.$("#"+id).renderedPosition({x:winWidth, y:winHeight});
	    if($("input[name='layout-radio']:checked").val()=="COSE_GRAPH_LAYOUT"){
	      cy.$("#"+id).lock();
	      cy.$("#"+id).renderedPosition({x:560, y:300});
	      
	    }

	    var jAni = cy.$('#'+id).animation({
	      renderedPosition:{x:winWidth, y:winHeight},
	      duration: 1000
	    });

	jAni.play().promise().then(function(){
	  console.log('animation done');
	});

	    cy.on('mouseover','node', function(evt){

	      var data = evt.cyTarget.data();
	      var directlyConnected = evt.cyTarget.neighborhood();
	      var x = evt.cyPosition.x;
	      var y = evt.cyPosition.y;
	      var x2, y2;
	    $(document).mousemove(function(event) {
	        x2 = event.pageX;
	        y2= event.pageY;
	        
	    });
	    console.log("pos:"+x+" "+y);

	    
	      var route = "/api/" + data.type + "s/" + data.id;

	     
	      $('#content-block-hover').hide();

	      $.get( route , function( extra_data ) {
	            
	            $('#content-block-hover').css('position','absolute');
	            $('#content-block-hover').css('top',y2 + 10 );
	            $('#content-block-hover').css('left',x2 + 10);


	            $('#content-block-hover').html( createHoverBox(data, extra_data) );

	            $('#content-block-hover').show();

	      });

	    });


	    cy.on('mouseout','node', function(evt){

	      cy.elements().css({ content: " " });

	      if(cy.$('node:selected')){
	        $('#content-block-hover').html("");
	        $('#content-block-hover').hide();    
	      }


	    });

	    cy.on('tap', 'node', function(evt){


	      cy.elements().removeClass('highlighted');
	      var node = evt.cyTarget;
	      var data = node.data();
	      var directlyConnected = node.neighborhood();
	      node.addClass('highlighted');
	      directlyConnected.nodes().addClass('highlighted');
	      node.connectedEdges().addClass('highlighted');

	      var x = evt.cyPosition.x;
	      var y = evt.cyPosition.y;


	      // display modal only if node is a contribution
	      if(data.type == 'contribution'){

	           var route = "/api/" + data.type + "s/" + data.id;

	            $.get( route , function( extra_data ) {


	                 data.extra = extra_data;
	                 angular.element($('.graph-container')).scope().showDetailsModal(data);

	            });


	        
	      }

	    });

	    cy.on('click', function(){
	        var node = cy.$('node:selected');  

	        if(node == undefined){
	         
	        }
	        else{
	        

	        }

	    })
	    
	}


	var refreshGraph = function(){

	    // check which layout is selected   
	    
	    // API Request for Entire Graph
	    $.get( "/graph/all", function( data ) {

	        makeGraph( 
	            data.nodes/*.map( function(node){ return createGraphNode(node) } )*/, 
	            data.links/*.map( function(edge){ return createGraphEdge(edge) } ) */           
	        );
	       
	    })

	}

	refreshGraph();




}])

