angular.module('studionet')

/*
 *	Controller for Groups
 * 
 */
.controller('GroupsCtrl', ['$scope', 'profile', 'groups', 'users', 'group', '$http', 'ModalService', function($scope, profile, groups, users, group, $http, ModalService){

	/*
	 * Scope Variables
	 */
	$scope.user = profile.user;
	$scope.groups = groups.groups;
	$scope.users = users.usersById();

	$scope.node; 
	$scope.showPopup = true;


	/*
     *		Trigger Modal Functions
	 */
	$scope.createGroup = function(){ 
		
		$("#createGroupModal").modal(); 

	}

	viewGroup = function(group_id){  


		angular.element($("#viewGroupModal")).scope().reset();

		group.getGroupInfo(group_id).then( function(){

			$("#viewGroupModal").modal();

		})

	}

	//$scope.viewGroup = function(){	$("#viewGroupModal").modal();	};

	$scope.editGroup = function( group_id ){	

		angular.element($("#editGroupModal")).scope().reset();

		group.getGroupInfo(group_id).then( function(){

			$("#editGroupModal").modal();

		})

	}


	/*
	 *  Helper Functions for the graph
	 */
	
	// Function to format graph nodes
	var createGraphNode = function(node){
	    
	    node.faveShape = "ellipse";

	    if( node.supernode ){
	          node.faveShape = "ellipse";
	          node.faveColor = "black";
	          node.width = "40";
	          node.height = "40";      
	    }
	    else if( node.type == "USER" ){
	          node.faveShape = "ellipse";
	          node.faveColor = "red";
	          node.width = "10";
	          node.height = "10";      
	    }
	    else if( node.requestingUserStatus == "Admin" ){
	          node.faveShape = "ellipse";
	          node.faveColor = "blue";
	          node.width = "20";
	          node.height = "20";      
	    }
	    else if( node.requestingUserStatus ){
	          node.faveShape = "ellipse";
	          node.faveColor = "green";
	          node.width = "20";
	          node.height = "20";      
	    }
	    else if( node.restricted ){
	          node.faveShape = "ellipse";
	          node.faveColor = "grey";
	          node.width = "20";
	          node.height = "20";      
	    }		    
	    else if( !node.restricted){
	          node.faveShape = "ellipse";
	          node.faveColor = "lightgreen";
	          node.width = "20";
	          node.height = "20";      
	    }
	    else {
	          node.faveShape = "ellipse";
	          node.faveColor = "red";
	          node.width = "10";
	          node.height = "10";
	    }

	    return  { data: node };
	}

	var createGraphEdge = function(edge){

	    edge.strength = EDGE_DEFAULT_STRENGTH;
	    edge.faveColor = EDGE_DEFAULT_COLOR;
	    edge.weigth = EDGE_DEFAULT_WEIGHT;
	    edge.label = edge.type;

	    return { data: edge };

	}

	/*
	 *   If user, display details for user
	 */
	var onTap = function(evt){
		
		if(evt.cyTarget.data().type == "USER"){
			console.log("you clicked on a user");
		}
		else{

			// remove other users
			var collection = cy.elements("node[type = 'USER']");
			cy.remove( collection );
			 
			if( evt.cyTarget.data().supernode ){
				return; 
			}
			else{

				group.getGroupInfo(evt.cyTarget.data().id).then( function(){

					// explode the node to show users
					group.getGroupUsers(evt.cyTarget.data().id)
					.then(function(){

						for (var i=0; i<group.users.length; i++) {

							group.users[i].type = "USER";

							var node = {
								group: "nodes",
								data: createGraphNode( group.users[i] ).data
							}

							var edge =  { source: evt.cyTarget.data().id, target: group.users[i].id }
							var edge = {
								group: "edges",
								data: createGraphEdge(edge).data
							}

						    cy.add([ node, edge ]);
						    cy.layout().stop(); 
						    layout = cy.elements().makeLayout({ 'name': 'cola'}); 
						    layout.start();

						}


					});
				})
				
			}
			
		}
	}

	var onHover = function(evt){

	    if(evt.cyTarget.data().supernode)
	    	return;

		// update the service
		group.getGroupInfo(evt.cyTarget.data().id);

	    var node = evt.cyTarget;
	    var nodeData = node.data();

	    var qtipFormat = {
	         content: {
	         	title: nodeData.name,
	         	text: ""
	    	 },
       
	         show: {
	            evt: evt.type,
	            ready: true,
	            solo: true
	         },
	         
	         hide: {
	            evt: 'mouseout',
	         },
	         
	         position: {
	         	//container: $('div.graph-container'),
	         	my: 'top left',
	         	at: 'center center'
	         },
	         
	         style: {
		        classes: 'qTipClass',
		        width: 200 // Overrides width set by CSS (but no max-width!)
		     }
	    }

	
	    // change content text for users
	    if(nodeData.type == "USER"){
	    	qtipFormat.content.text = "<center><img " + 
	    				   "style='width: 80px; height: 80px;' " +
	    				   "src=' " + nodeData.avatar+ "'><br>";

	    	qtipFormat.style.width = '80px';

	    }
	    else{
			qtipFormat.content.text +="<p>" + nodeData.description.substr(0,100)  +
	         		  "<button class='btn btn-link btn-sm pull-right qtip-btn' onclick='viewGroup(" + nodeData.id +")'>More</button></p>"
	    }

	    node.qtip(qtipFormat, evt);		
	}

	var drawGraph = function(){

		profile.getGroups().then( function(){ 

			groups.getAll().then( function(){

				groups.getGraph().then(function(){

						// creating the grpah
						var graph = makeGraph( groups.graph, 'user-graph', createGraphNode);
						
						// add interactions 
						graph.on('tap', 'node', function(evt){ onTap(evt); })
						graph.on('mouseover', 'node', function(evt) { onHover(evt); });

						// attach it to the scope
						$scope.graph = graph;
			    })

			})
		})

	};

	drawGraph();

	$scope.refreshGraph = drawGraph;  // fetches fresh data from server


}])


/*
 *	Controller for the group creation modal 
 */
.controller('CreateGroupCtrl', ['$scope', 'groups', 'supernode', function($scope, groups, supernode){

	$scope.groupCreated = false; 
	$scope.groupError = false;

	$scope.newGroupId = undefined;


	$scope.group = {
		groupParentId: supernode.group
	};

	$scope.createGroup = function(){

		groups.createNewGroup($scope.group).then( function(data){
		
			// refresh the graph underneath
			// function present in container scope
			$scope.newGroupId = data.data.id;
			$scope.$parent.refreshGraph();
			showSuccess();
		
		}, function(error){

			showError();

		});

	}

	$scope.editGroup = function(){
		$scope.$parent.editGroup( $scope.newGroupId  );
	}

	var showSuccess = function(){

		$scope.groupCreated = true;
		$scope.groupError = false;
		
	}

	var showError = function(){
		$scope.groupError = true;
	}


}])


/*
 *	Controller for the edit group modal 
 */
.controller('EditGroupCtrl', ['$scope', 'groups', 'group', 'supernode', function($scope, groups, group, supernode){

	$scope.activeGroup = group.group;

	$scope.status = {};

	$scope.saveGroup = function(){

		group.updateGroup($scope.activeGroup).then( function(data){
		
			// refresh the graph underneath
			// function present in container scope
			$scope.$parent.refreshGraph();

			showSuccess();
		
		}, function(error){

			showError();

		});

	}

	var showSuccess = function(){
		$scope.status.value = true;
		$scope.status.msg = "Group edited." 
	}

	var showError = function(){
		$scope.status.value = false;
		$scope.status.msg = "Error occured while editing group." 
	}

	$scope.reset = function(){
		$scope.status = {};
	}

}])

/*
 *	Controller for the view group modal 
 */
.controller('ViewGroupCtrl', ['$scope', 'profile', 'group', function($scope, profile, group){

	// check if scope has active group
	$scope.activeGroup = group.group;
	$scope.members = group.users;

	$scope.active = 0; 
	$scope.error = undefined;
	$scope.success = undefined; 

	$scope.reset = function(){
		$scope.active = 0; 
		$scope.error = undefined;
		$scope.success = undefined; 
	}

	$scope.deleteGroup = function(){
		group.deleteGroup().then(function(){
				showSuccess();

				$scope.$parent.refreshGraph();


		}, function(){
				showError();
		});

	}

	$scope.editGroup = function(){
		$scope.$parent.editGroup( $scope.activeGroup.id );
	}



	$scope.leaveGroup = function(){
		group.leave().then( function(){
			showSuccess("Successsfully left the group"); 
			$scope.$parent.refreshGraph();
		});
	}


	$scope.joinGroup = function(){
		group.leave().then( function(){
			showSuccess("Successsfully joined the group"); 
			$scope.$parent.refreshGraph();
		});
	}


	var showSuccess = function(msg){

		$scope.success = true;
		$scope.error = false;
		$scope.successMsg = msg || "Group has been deleted."
		
	}

	var showError = function(){
		$scope.error = true;
	}

}])

