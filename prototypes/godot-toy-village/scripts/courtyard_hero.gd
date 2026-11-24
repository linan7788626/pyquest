extends Node3D

const STRIDE_DISTANCE := 1.42
const CONTACT_FRACTION := 0.58
const HALF_STEP := 0.26

var body: Node3D
var head: Node3D
var cape: Node3D
var arms: Array[Node3D] = []
var elbows: Array[Node3D] = []
var legs: Array[Node3D] = []
var knees: Array[Node3D] = []
var feet: Array[Node3D] = []
var arm_rest: Array[Vector3] = []
var elbow_rest: Array[Vector3] = []
var leg_rest: Array[Vector3] = []
var knee_rest: Array[Vector3] = []
var foot_rest: Array[Vector3] = []
var body_rest: Vector3
var head_rest: Vector3
var cape_rest: Vector3
var facing := Vector2.DOWN
var phase := 0.0
var stride_weight := 0.0
var seconds := 0.0

func bind(model: Node3D) -> bool:
	add_child(model)
	body = model.find_child("Body", true, false) as Node3D
	head = model.find_child("Head", true, false) as Node3D
	cape = model.find_child("Cape", true, false) as Node3D
	if not (body and head and cape):
		return false
	for side in ["L", "R"]:
		arms.append(body.find_child("Arm" + side, true, false) as Node3D)
		elbows.append(body.find_child("Elbow" + side, true, false) as Node3D)
		legs.append(body.find_child("Leg" + side, true, false) as Node3D)
		knees.append(body.find_child("Knee" + side, true, false) as Node3D)
		feet.append(body.find_child("Foot" + side, true, false) as Node3D)
		if not (arms.back() and elbows.back() and legs.back() and knees.back() and feet.back()):
			return false
		arm_rest.append(arms.back().rotation)
		elbow_rest.append(elbows.back().rotation)
		leg_rest.append(legs.back().rotation)
		knee_rest.append(knees.back().rotation)
		foot_rest.append(feet.back().rotation)
	body_rest = body.position
	head_rest = head.rotation
	cape_rest = cape.rotation
	return true

func reset() -> void:
	facing = Vector2.DOWN
	rotation.y = 0.0
	phase = 0.0
	stride_weight = 0.0
	pose(0.0)

func animate(input: Vector2, right: Vector3, forward: Vector3, travel: float, delta: float, swing: float) -> void:
	seconds += delta
	if not input.is_zero_approx():
		var horizontal := absf(input.x) > absf(input.y)
		if is_equal_approx(absf(input.x), absf(input.y)):
			# Keep the previous cardinal direction while that key is still held.
			if input.dot(facing) <= 0.0:
				facing = Vector2(0.0, signf(input.y))
		else:
			facing = Vector2(signf(input.x), 0.0) if horizontal else Vector2(0.0, signf(input.y))
		var look := right * facing.x + forward * facing.y
		var target := atan2(look.x, look.z)
		rotation.y = lerp_angle(rotation.y, target, 1.0 - exp(-26.0 * delta))
	if travel > 0.0005:
		phase = fposmod(phase + travel / STRIDE_DISTANCE, 1.0)
	var strength := clampf(travel / (delta * 2.3), 0.0, 1.0)
	stride_weight = move_toward(stride_weight, strength, delta * 8.0)
	pose(swing)

func pose(swing: float) -> void:
	var turn := TAU * phase
	var bob := (-0.033 + 0.026 * (1.0 - cos(turn * 2.0))) * stride_weight
	# Lower the hips near full reach so a planted boot does not float at toe-off.
	for side in range(2):
		var foot_phase := fposmod(phase + 0.5 * float(side), 1.0)
		if foot_phase <= CONTACT_FRACTION:
			var depth := contact_depth(foot_phase) * stride_weight
			var reach := -knees[side].position.y - feet[side].position.y
			bob = minf(bob, sqrt(maxf(0.0, reach * reach - depth * depth)) - reach)
	body.position.y = body_rest.y + bob
	head.rotation = head_rest + Vector3(0.025 * sin(turn * 2.0), 0.0, 0.036 * sin(turn)) * stride_weight
	cape.rotation = cape_rest + Vector3(0.17, 0.08 * sin(turn), 0.05 * cos(turn)) * stride_weight
	cape.rotation.y += 0.022 * sin(seconds * 2.7)
	for side in range(2):
		var offset := 0.5 * float(side)
		var foot_phase := fposmod(phase + offset, 1.0)
		pose_foot(side, foot_phase, bob)
		var arm_swing := cos(TAU * (foot_phase - 0.04)) * stride_weight
		var arm_scale := 1.0 if side == 0 else 0.66
		arms[side].rotation = arm_rest[side] + Vector3(arm_swing * 0.42 * arm_scale, 0.03 * sin(turn), 0.0)
		elbows[side].rotation = elbow_rest[side] + Vector3(-stride_weight * 0.10 - maxf(0.0, -arm_swing) * 0.28 * arm_scale, 0.0, 0.0)
	if swing > 0.0:
		var arc := (1.0 - swing / 0.32) * PI
		arms[0].rotation += Vector3(-1.10 * sin(arc), 0.75 * sin(arc * 2.0), 0.30 * sin(arc))
		elbows[0].rotation.x -= 0.38 * sin(arc)

func pose_foot(side: int, foot_phase: float, bob: float) -> void:
	var depth: float
	var lift := 0.0
	var pitch := 0.0
	if foot_phase < CONTACT_FRACTION:
		depth = contact_depth(foot_phase)
	else:
		var recovery := (foot_phase - CONTACT_FRACTION) / (1.0 - CONTACT_FRACTION)
		depth = lerpf(-HALF_STEP, HALF_STEP, smoothstep(0.0, 1.0, recovery))
		lift = 0.16 * sin(recovery * PI)
		pitch = 0.29 * sin(recovery * TAU)
	var upper := -knees[side].position.y
	var lower := -feet[side].position.y
	var forward := depth * stride_weight
	var down := upper + lower + bob - lift * stride_weight
	var length := minf(Vector2(forward, down).length(), upper + lower - 0.0001)
	var bend := acos(clampf((length * length - upper * upper - lower * lower) / (2.0 * upper * lower), -1.0, 1.0))
	var hip := atan2(-forward, down) - atan2(lower * sin(bend), upper + lower * cos(bend))
	# This two-link solve keeps the boot level over the contact portion and lifts it on recovery.
	legs[side].rotation = leg_rest[side] + Vector3(hip, 0.0, 0.0)
	knees[side].rotation = knee_rest[side] + Vector3(bend, 0.0, 0.0)
	feet[side].rotation = foot_rest[side] + Vector3(pitch * stride_weight - hip - bend, 0.0, 0.0)

func contact_depth(foot_phase: float) -> float:
	return lerpf(HALF_STEP, -HALF_STEP, foot_phase / CONTACT_FRACTION)
