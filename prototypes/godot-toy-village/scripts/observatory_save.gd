extends RefCounted

const VERSION := 1
const STAGES := ["notice", "manual", "power", "exposure", "chart", "complete"]

static func read(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if not file or file.get_length() > 4096:
		return {}
	var result: Variant = JSON.parse_string(file.get_as_text())
	if not result is Dictionary or result.get("version") != VERSION:
		return {}
	var stage := STAGES.find(result.get("stage"))
	var inside: Variant = result.get("inside")
	if stage < 0 or not inside is bool:
		return {}
	return {"stage": stage, "inside": inside}

static func store(path: String, stage: int, inside: bool) -> Error:
	var temporary := "%s.%d.tmp" % [path, OS.get_process_id()]
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if not file:
		return FileAccess.get_open_error()
	var payload := {"version": VERSION, "stage": STAGES[stage], "inside": inside}
	var wrote := file.store_string(JSON.stringify(payload))
	file.flush()
	var status := file.get_error()
	file.close()
	var absolute := ProjectSettings.globalize_path(temporary)
	if wrote and status == OK:
		status = DirAccess.rename_absolute(absolute, ProjectSettings.globalize_path(path))
		if status == OK:
			return OK
	DirAccess.remove_absolute(absolute)
	return status if status != OK else ERR_FILE_CANT_WRITE
