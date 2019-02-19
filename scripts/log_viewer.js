var current_question = null;
var current_user = null;
var current_layout = 0;
var current_checkpoint = 0;
var current_filename = null;
var logs = null;
var layout_options = ['Single Page','Two Page'];


$(document).ready(function(){
	setup()
});

function setup(){
	
	//once user uploads file, much of the site becomes operational (see parseLogs method)
	document.getElementById("file_upload").addEventListener("change", parseLogs, false);
	
	//default layout is single page. to make default double page comment out hide() line
	$('#page_left').hide();
	$('#layout_button').on('click', function() {
		toggleLayout();
	});
	
	
	//adding simple key shortcuts to common operations
	$(document).keydown(function(e) {
		//only apply shortcut if not in text input field
		if (!(e.target.nodeName == 'INPUT' && e.target.type == 'text')){
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
		}
	});
	
	//used for stylizing code
	hljs.initHighlightingOnLoad();
}

function parseLogs(){
	var file = this.files;
	if (file != null && file.length > 0){
		file = file[0];
		current_filename = file['name'];
		console.log(file);
		const reader = new FileReader()
		reader.onload = function(event) {
			//try {
				logs = JSON.parse(reader.result);
				
				populateToolbar();
				
				initilizeViewerControls();
				
			//} catch(e) {
			//	console.log(e);
			//	alert('Failed to parse file as JSON. Try again.\n'+e); // error in the above string (in this case, yes)!
			//	logs = null;
			//}
		};
		reader.readAsText(file);
		
	} else {
		console.log('failed to parse file: '+file);
	}
}

function populateToolbar(){
	//reset any prexisting values? check validity of this later
	current_question = null;
	current_user = null;
	current_layout = 0;
	current_checkpoint = 0;
	
	
	$('#file_export').on('click', function(){
		exportFile();
	});
	
	$('#file_export_name').on('keydown', function(e){
		if (e.which == 13){
			exportFile();
		}
	});
	
	$('#question_select_div').html('Question:');
	var question_select = $('<select />');
	$(question_select).on('change', function(){
		updateQuestion($(this).val());
	});
	logs['qids'].forEach(function(qid){
		if (current_question == null){
			current_question = qid;
		}
		$('<option />', {value: qid, text: qid}).appendTo(question_select);
		$('#question_select_div').append(question_select);
	});
	
	$('#user_select_div').html('User:');
	var user_select = $('<select />');
	$(user_select).on('change', function(){
		updateUser($(this).val());
	});
	logs['uids'].forEach(function(uid){
		if(current_user == null){
			current_user = uid;
		}
		$('<option />', {value: uid, text: uid}).appendTo(user_select);
		$('#user_select_div').append(user_select);
	});
	
	$('#tag_button').on('click', function(){
		createTag();
	});
	
	$('#tag_input').on('keydown', function(e){
		if (e.which == 13){
			createTag();
		}
	});
	
	$('#render_checkbox').on('change', function(){
		console.log($('#render_checkbox').prop('checked'));
		var keep_position = true;
		populateView(keep_position);
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
	var keep_position = true;
	current_checkpoint--;
	populateView(keep_position);	
}

function turnRight(){
	var keep_position = true;
	current_checkpoint++;
	populateView(keep_position);
}

function updatePosition(new_position){
	console.log('Current: '+current_checkpoint);
	current_checkpoint = new_position;
	var keep_position = true;
	populateView(keep_position);
}

function updateQuestion(number){
	var old = current_question
	current_question = number;
	
	initilizeViewerControls();
	
	var keep_position = false;
	populateView(keep_position)
}

function updateUser(number){
	var old = current_user;
	current_user = number;
	
	initilizeViewerControls();
	
	var keep_position = false;
	populateView(keep_position)
}

function toggleLayout(){
	var old = current_layout
	current_layout = (old + 1) % layout_options.length;
	var keep_position = true;
	populateView(keep_position);
}

function populateView(keep_position){
	if (!keep_position){
		current_checkpoint = 0;
	}
	
	if (current_layout == 0){
		//hide other page
		$('#page_left').hide();
	} else {
		$('#page_left').show();
	}	
	
	if (logs != null){
		//reset the view pages
		$('#page_right_output').removeClass('correct');
		$('#page_left_output').removeClass('correct');
		
		var checkpoints = getCheckpoints();
		
		//check for boundaries of position
		if (current_checkpoint == checkpoints.length){
			current_checkpoint--;
		}
		if (current_checkpoint == -1){
			current_checkpoint++;
		}
		
		//grab current checkpoint
		var checkpoint = checkpoints[current_checkpoint];
		
		//initialize the blocks
		var left_code_work    = 'No prior work';
		var left_code_output  = '...';
		var right_code_work   = checkpoint['work'].trim();
		var right_code_output = checkpoint['output'].trim();
		
		//handle showing previous page if there is one
		var previous_checkpoint = null;
		if (current_checkpoint != 0){
			//grab previous page and display it
			previous_checkpoint = checkpoints[current_checkpoint-1];
			left_code_work      = previous_checkpoint['work'].trim();
			left_code_output    = previous_checkpoint['output'].trim();
		}
		
		//stylize html based on if it is code or not
		var render_as_code = $('#render_checkbox').prop('checked');
		if (render_as_code){
			
			//if it is to be rendered as code, need to wrap in pre code blocks
			left_code_work    = '<pre><code>'+left_code_work   +'</code></pre>';
			left_code_output  = '<pre><code>'+left_code_output +'</code></pre>';
			right_code_work   = '<pre><code>'+right_code_work  +'</code></pre>';
			right_code_output = '<pre><code>'+right_code_output+'</code></pre>';

			//color correct output green
			if (checkpoint['output'].includes('appears correct') && !checkpoint['output'].includes('incorrect')){
				$('#page_right_output').addClass('correct');
			}
			if (previous_checkpoint != null && previous_checkpoint['output'].includes('appears correct') && !previous_checkpoint['output'].includes('incorrect')){
				$('#page_left_output').addClass('correct');
			}
			
		} else {
			left_code_work    = '<div>'+left_code_work   +'</div>';
			left_code_output  = '<div>'+left_code_output +'</div>';
			right_code_work   = '<div>'+right_code_work  +'</div>';
			right_code_output = '<div>'+right_code_output+'</div>';
		}
		
		//now display the checkpoint
		$('#page_left_work').html(left_code_work);
		$('#page_left_output').html(left_code_output);
		$('#page_right_work').html(right_code_work);
		$('#page_right_output').html(right_code_output);
	}
	
	populateTagControls();
	
	$('#jump_select').val(current_checkpoint);

	$('pre code').each(function(i, e) {hljs.highlightBlock(e)});
}

function populateTagControls(){
	//populate tag controls
	$('#tag_checkbox_div').html('');
	if (logs != null){
		var checkpoint_tags = getCurrentCheckpoint()['tags'];
		
		//add tags list if it doesn't exist yet
		if (logs['all_tags'] == null){
			logs['all_tags'] = [];
		}
		
		//populate each checkbox
		if (logs['all_tags'].length == 0){
			$('#tag_checkbox_div').text('No tags found');
		} else {
			logs['all_tags'].forEach(tag => {
				$('#tag_checkbox_div').append('<input type="checkbox" id="tag_id_'+tag+'" name="tag_name_'+tag+'" value="'+tag+'">'+tag+'<br>');
				var tag_in_checkpoint = checkpoint_tags.includes(tag);
				$('#tag_id_'+tag).prop('checked', tag_in_checkpoint);
				$('#tag_id_'+tag).on('change', function(){
					updateTag('#tag_id_'+tag);
				});
			});
		}
		
	}
}

function updateTag(tag_id){
	console.log(tag_id+'\n'+$(tag_id).prop('checked')+'\n'+$(tag_id).val());
	
	var checkpoint = getCheckpoints()[current_checkpoint];
	console.log(checkpoint['tags']);
	if (checkpoint['tags'] == null){
		checkpoint['tags'] = [];
	}
	if ($(tag_id).prop('checked')){
		checkpoint['tags'].push($(tag_id).val());
	} else {
		var matching_index = checkpoint['tags'].indexOf($(tag_id).val());
		if (matching_index > -1) {
		  checkpoint['tags'].splice(matching_index, 1);
		}
	}
	console.log(checkpoint['tags']);
}

function createTag(){
	var new_tag = $.trim($('#tag_input').val());
	if (new_tag != ''){
		if (logs != null){
			console.log(logs['all_tags']);
			if (logs['all_tags'] == null){
				logs['all_tags'] = [];
			}
			if (!logs['all_tags'].includes(new_tag)){
				logs['all_tags'].push(new_tag);
			}
			console.log(logs['all_tags']);
			$('#tag_input').val('');
			populateTagControls();
		}
	} else {
		$('#tag_input').val('');
	}
}

function exportFile(){
	if (logs != null){
		var new_filename = null;
		if ($('#file_export_name').val() == ''){
			new_filename = current_filename;
		} else {
			new_filename = $('#file_export_name').val();
		}
		
		if (!new_filename.endsWith('.json')){
			new_filename += '.json';
		}
		download(JSON.stringify(logs), new_filename, 'text/json');
	}
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function getCheckpoints(){
	if (logs != null){
		return logs['users'][current_user]['questions'].find(q => {return q['id']==current_question})['checkpoints']
	}
}

function getCurrentCheckpoint(){
	if (logs != null){
		return logs['users'][current_user]['questions'].find(q => {return q['id']==current_question})['checkpoints'][current_checkpoint]
	}
}