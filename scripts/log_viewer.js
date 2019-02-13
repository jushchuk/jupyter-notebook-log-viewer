var current_question = null;
var current_user = null;
var current_layout = 0;
var current_checkpoint = 0;
var logs = null;
var layout_options = ['Single Page','Two Page'];


$(document).ready(function(){
	setup()
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setup(){
	
	document.getElementById("file_upload").addEventListener("change", parseLogs, false);
	
	$('#page_left_output').hide();
	$('#page_right_output').hide();
	$('#layout_button').on('click', function() {
		toggleLayout();
	});
	
	$(document).keydown(function(e) {
		switch(e.which) {
			case 37: // left
			turnLeft();
			break;

			case 39: // right
			turnRight();
			break;

			case 84: // right
			toggleLayout();
			break;
			
			default: return; // exit this handler for other keys
		}
		e.preventDefault(); // prevent the default action (scroll / move caret)
	});
	
	hljs.initHighlightingOnLoad();
}

function parseLogs(){
	var file = this.files;
	if (file != null && file.length > 0){
		file = file[0];
		console.log(file);
		const reader = new FileReader()
		reader.onload = function(event) {
			try {
				logs = JSON.parse(reader.result);
				
				populateToolbar();
				
				initilizeViewerControls();
				
			} catch(e) {
				alert('Failed to parse file as JSON. Try again.\n'+e); // error in the above string (in this case, yes)!
				logs = null;
			}
		};
		reader.readAsText(file);
		
	} else {
		console.log('failed to parse file: '+file);
	}
}

function populateToolbar(){
	
	
	var question_select = $('<select />');
	$(question_select).on('change', function(){
		updateQuestion($(this).val());
	});
	logs['qids'].forEach(function(qid){
		if(current_question == null){
			current_question = qid;
		}
		$('<option />', {value: qid, text: qid}).appendTo(question_select);
		$('#question_select_div').append(question_select);
	});
	
	var user_select = $('<select />');
	$(user_select).on('change', function(){
		console.log('ASDASDKJSADHKAJSD');
		updateUser($(this).val());
	});
	logs['uids'].forEach(function(uid){
		if(current_user == null){
			current_user = uid;
		}
		$('<option />', {value: uid, text: uid}).appendTo(user_select);
		$('#user_select_div').append(user_select);
	});
	
	var keep_position = false;
	populateView(keep_position);
}

function initilizeViewerControls(){
	$('#turn_left_button').on('click', function(){
		turnLeft();
	});
	
	$('#jump_select').on('change', function(){
		updatePosition($(this).val());
	});
	
	//remove old options
	$('#jump_select').find('option').remove()
	
	//add new options based on current question and user
	var number_of_positions = logs['users'][current_user]['questions'].find(q => {return q['id']==current_question})['checkpoints'].length;
	for (var i=0; i<number_of_positions; i++){
		$('<option />', {value: i, text: i}).appendTo($('#jump_select'));
	}
	
	$('#turn_right_button').on('click', function(){
		turnRight();
	});
}

function turnLeft(){
	console.log('Turn Left');
	var keep_position = true;
	current_checkpoint--;
	populateView(keep_position);	
}

function turnRight(){
	console.log('Turn Right');
	var keep_position = true;
	current_checkpoint++;
	populateView(keep_position);
}

function updatePosition(new_position){
	console.log('Current: '+current_checkpoint);
	current_checkpoint = new_position;
	console.log('New: '+current_checkpoint);
	var keep_position = true;
	populateView(keep_position);
	console.log('Should be same: '+current_checkpoint);
}

function updateQuestion(number){
	var old = current_question
	current_question = number;
	console.log('Question updated. Was '+old+' Now '+current_question);
	
	initilizeViewerControls();
	
	var keep_position = false;
	populateView(keep_position)
}

function updateUser(number){
	var old = current_user;
	current_user = number;
	console.log('User updated. Was '+old+' Now '+current_user);
	
	initilizeViewerControls();
	
	var keep_position = false;
	populateView(keep_position)
}

function toggleLayout(){
	var old = current_layout
	current_layout = (old + 1) % layout_options.length;
	console.log('Layout updated. Was '+old+' Now '+current_layout);
	var keep_position = true;
	populateView(keep_position);
}

function populateView(keep_position){
	if (!keep_position){
		current_checkpoint = 0;
	}
	
	//single page view
	if (current_layout == 0){
		//hide other page
		$('#page_left_output').hide();
		$('#page_right_output').hide();
		
		if (logs != null){
			var checkpoints = logs['users'][current_user]['questions'].find(q => {return q['id']==current_question})['checkpoints']
			//var checkpoints = logs['users'][current_user]['questions'][current_question]['checkpoints'];
			
			//check for boundaries of position
			if (current_checkpoint == checkpoints.length){
				current_checkpoint--;
			}
			if (current_checkpoint == -1){
				current_checkpoint++;
			}
			
			//grab the current checkpoint and display it
			var checkpoint = checkpoints[current_checkpoint];
			$('#page_left_work').text(checkpoint['work'].trim());
			$('#page_right_work').text(checkpoint['output'].trim());
			
			
			//color correct output green
			if (checkpoint['output'].includes('appears correct') && !checkpoint['output'].includes('incorrect')){
				$('#page_right_work').addClass('correct');
			} else {
				$('#page_right_work').removeClass('correct');
			}
		}
		
	//two page layout
	} else {
		//reshow other page
		$('#page_left_output').show();
		$('#page_right_output').show();
		$('#page_right_work').removeClass('correct');
		
		if (logs != null){
			var checkpoints = logs['users'][current_user]['questions'].find(q => {return q['id']==current_question})['checkpoints']
			//var checkpoints = logs['users'][current_user]['questions'][current_question]['checkpoints'];
			
			//check for boundaries of position
			if (current_checkpoint == checkpoints.length){
				current_checkpoint--;
			}
			if (current_checkpoint == -1){
				current_checkpoint++;
			}
			
			//grab current checkpoint and display it
			var checkpoint = checkpoints[current_checkpoint];
			$('#page_right_work').text(checkpoint['work'].trim());
			$('#page_right_output').text(checkpoint['output'].trim());
			
			//color correct output green
			if (checkpoint['output'].includes('appears correct') && !checkpoint['output'].includes('incorrect')){
				$('#page_right_output').addClass('correct');
			} else {
				$('#page_right_output').removeClass('correct');
			}
			
			
			//handle showing previous page when there is none
			if (current_checkpoint == 0){
				$('#page_left_work').text('No prior work');
				$('#page_left_output').text('...');
			} else {
				//grab previous page and display it
				var previous_checkpoint = checkpoints[current_checkpoint-1];
				$('#page_left_work').text(previous_checkpoint['work'].trim());
				$('#page_left_output').text(previous_checkpoint['output'].trim());
				
				//color correct output green
				if (previous_checkpoint['output'].includes('appears correct') && !previous_checkpoint['output'].includes('incorrect')){
					$('#page_left_output').addClass('correct');
				} else {
					$('#page_left_output').removeClass('correct');
				}
			}
		
		}
	}
	
	$('#jump_select').val(current_checkpoint);

	$('pre code').each(function(i, e) {hljs.highlightBlock(e)});
}