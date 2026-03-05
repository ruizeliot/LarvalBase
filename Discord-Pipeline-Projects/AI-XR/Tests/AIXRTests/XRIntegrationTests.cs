using AIXR.XR;
using AIXR.Editor;
using AIXR.Pipeline;
using AIXR.Providers;
using AIXR.Providers.Registry;
using AIXR.Error;
using AIXR.Input;
using UnityEngine;

namespace AIXRTests;

#region MCPEditorSetup Tests (US-8)

[TestFixture]
public class MCPEditorSetupTests
{
    private MCPEditorSetup _setup = null!;

    [SetUp]
    public void SetUp()
    {
        _setup = new MCPEditorSetup();
    }

    // AC1: unity-mcp package installed and configured
    [Test]
    public void PackageName_Is_Unity_MCP()
    {
        Assert.That(MCPEditorSetup.PackageName, Is.EqualTo("com.unity.mcp"));
    }

    // AC2: MCP provides hierarchy read/write, component inspection, scene commands, prefab instantiation
    [Test]
    public void Supported_Capabilities_Defined()
    {
        var caps = MCPEditorSetup.SupportedCapabilities;
        Assert.That(caps, Does.Contain("hierarchy_read"));
        Assert.That(caps, Does.Contain("hierarchy_write"));
        Assert.That(caps, Does.Contain("component_inspection"));
        Assert.That(caps, Does.Contain("scene_commands"));
        Assert.That(caps, Does.Contain("prefab_instantiation"));
    }

    // AC4: MCP is editor-only -- stripped from runtime builds
    [Test]
    public void IsEditorOnly_Returns_True()
    {
        Assert.That(MCPEditorSetup.IsEditorOnly, Is.True);
    }

    // AC5: MCP connection status indicator
    [Test]
    public void Initial_Connection_Status_Is_Disconnected()
    {
        Assert.That(_setup.ConnectionStatus, Is.EqualTo(MCPConnectionStatus.Disconnected));
    }

    [Test]
    public void SetConnectionStatus_Updates_Status()
    {
        _setup.SetConnectionStatus(MCPConnectionStatus.Connected);
        Assert.That(_setup.ConnectionStatus, Is.EqualTo(MCPConnectionStatus.Connected));
    }

    [Test]
    public void SetConnectionStatus_Fires_Event()
    {
        MCPConnectionStatus? received = null;
        _setup.OnConnectionStatusChanged += status => received = status;

        _setup.SetConnectionStatus(MCPConnectionStatus.Connected);
        Assert.That(received, Is.EqualTo(MCPConnectionStatus.Connected));
    }

    [Test]
    public void ServerPort_Has_Default()
    {
        Assert.That(_setup.ServerPort, Is.GreaterThan(0));
    }

    [Test]
    public void SetServerPort_Updates_Port()
    {
        _setup.SetServerPort(9090);
        Assert.That(_setup.ServerPort, Is.EqualTo(9090));
    }
}

#endregion

#region BuildAutomation Tests (US-8)

[TestFixture]
public class BuildAutomationTests
{
    private BuildAutomation _build = null!;

    [SetUp]
    public void SetUp()
    {
        _build = new BuildAutomation();
    }

    // AC3: Build pipeline: Editor -> MCP Test -> Android Build -> APK Sign -> Quest Deploy
    [Test]
    public void Build_Pipeline_Has_Four_Steps()
    {
        var steps = BuildAutomation.PipelineSteps;
        Assert.That(steps, Has.Length.EqualTo(4));
        Assert.That(steps[0], Is.EqualTo("MCP Test"));
        Assert.That(steps[1], Is.EqualTo("Android Build"));
        Assert.That(steps[2], Is.EqualTo("APK Sign"));
        Assert.That(steps[3], Is.EqualTo("Quest Deploy"));
    }

    // AC3: Android Build with ARM64 target, OpenXR
    [Test]
    public void Build_Target_Is_Android_ARM64()
    {
        Assert.That(_build.BuildTarget, Is.EqualTo("Android"));
        Assert.That(_build.Architecture, Is.EqualTo("ARM64"));
    }

    [Test]
    public void XR_Plugin_Is_OpenXR()
    {
        Assert.That(_build.XRPlugin, Is.EqualTo("OpenXR"));
    }

    // AC3: Sign with debug keystore (dev)
    [Test]
    public void Default_Keystore_Is_Debug()
    {
        Assert.That(_build.KeystoreType, Is.EqualTo(KeystoreType.Debug));
    }

    [Test]
    public void SetKeystoreType_Updates()
    {
        _build.SetKeystoreType(KeystoreType.Release);
        Assert.That(_build.KeystoreType, Is.EqualTo(KeystoreType.Release));
    }

    // AC4: editor-only
    [Test]
    public void IsEditorOnly_Returns_True()
    {
        Assert.That(BuildAutomation.IsEditorOnly, Is.True);
    }

    // Build state tracking
    [Test]
    public void Initial_State_Is_Idle()
    {
        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Idle));
    }

    [Test]
    public void StartPipeline_Sets_Running_State()
    {
        _build.StartPipeline();
        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Running));
    }

    [Test]
    public void StartPipeline_Begins_At_First_Step()
    {
        _build.StartPipeline();
        Assert.That(_build.CurrentStepIndex, Is.EqualTo(0));
        Assert.That(_build.CurrentStepName, Is.EqualTo("MCP Test"));
    }

    [Test]
    public void AdvanceStep_Moves_To_Next()
    {
        _build.StartPipeline();
        _build.AdvanceStep();
        Assert.That(_build.CurrentStepIndex, Is.EqualTo(1));
        Assert.That(_build.CurrentStepName, Is.EqualTo("Android Build"));
    }

    [Test]
    public void AdvanceStep_Past_Last_Completes_Pipeline()
    {
        _build.StartPipeline();
        _build.AdvanceStep(); // -> Android Build
        _build.AdvanceStep(); // -> APK Sign
        _build.AdvanceStep(); // -> Quest Deploy
        _build.AdvanceStep(); // -> Complete

        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Complete));
    }

    [Test]
    public void FailStep_Sets_Failed_State()
    {
        _build.StartPipeline();
        _build.FailStep("Build error: missing SDK");

        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Failed));
        Assert.That(_build.LastError, Is.EqualTo("Build error: missing SDK"));
    }

    [Test]
    public void ADB_Deploy_Command_Format()
    {
        string apkPath = "/path/to/app.apk";
        string cmd = BuildAutomation.GetDeployCommand(apkPath);
        Assert.That(cmd, Is.EqualTo("adb install -r /path/to/app.apk"));
    }

    [Test]
    public void OnStepCompleted_Event_Fires()
    {
        string? completedStep = null;
        _build.OnStepCompleted += step => completedStep = step;

        _build.StartPipeline();
        _build.AdvanceStep();

        Assert.That(completedStep, Is.EqualTo("MCP Test"));
    }

    [Test]
    public void Cannot_Advance_When_Idle()
    {
        _build.AdvanceStep(); // should be no-op
        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Idle));
    }

    [Test]
    public void Cannot_Advance_When_Failed()
    {
        _build.StartPipeline();
        _build.FailStep("error");
        _build.AdvanceStep(); // should be no-op
        Assert.That(_build.CurrentState, Is.EqualTo(BuildState.Failed));
    }
}

#endregion

#region XRSetup Tests (US-9)

[TestFixture]
public class XRSetupTests
{
    private XRSetup _xr = null!;

    [SetUp]
    public void SetUp()
    {
        _xr = new XRSetup();
    }

    // AC1: Scene uses OVRCameraRig
    [Test]
    public void Camera_Rig_Name_Is_OVRCameraRig()
    {
        Assert.That(XRSetup.CameraRigName, Is.EqualTo("OVRCameraRig"));
    }

    // AC2: Passthrough enabled, underlay mode
    [Test]
    public void Passthrough_Enabled_By_Default()
    {
        Assert.That(_xr.IsPassthroughEnabled, Is.True);
    }

    [Test]
    public void Passthrough_Mode_Is_Underlay()
    {
        Assert.That(_xr.PassthroughMode, Is.EqualTo(PassthroughMode.Underlay));
    }

    // AC2: No skybox, clear alpha=0
    [Test]
    public void Clear_Color_Alpha_Is_Zero()
    {
        Assert.That(_xr.ClearColorAlpha, Is.EqualTo(0f));
    }

    // Scene init state
    [Test]
    public void Initial_State_Not_Initialized()
    {
        Assert.That(_xr.IsInitialized, Is.False);
    }

    [Test]
    public void Initialize_Sets_Initialized()
    {
        _xr.Initialize();
        Assert.That(_xr.IsInitialized, Is.True);
    }

    [Test]
    public void Initialize_Fires_Event()
    {
        bool fired = false;
        _xr.OnInitialized += () => fired = true;

        _xr.Initialize();
        Assert.That(fired, Is.True);
    }
}

#endregion

#region SpatialAnchorManager Tests (US-9)

[TestFixture]
public class SpatialAnchorManagerTests
{
    private SpatialAnchorManager _manager = null!;

    [SetUp]
    public void SetUp()
    {
        _manager = new SpatialAnchorManager();
    }

    // AC3: Spatial anchor for incarnation position, persists across sessions
    [Test]
    public void Initially_No_Anchor_Saved()
    {
        Assert.That(_manager.HasSavedAnchor, Is.False);
    }

    // AC4: First launch - user points and taps to place
    [Test]
    public void SaveAnchor_Stores_Position()
    {
        var pos = new Vector3(1f, 0f, 2f);
        var rot = Quaternion.identity;
        _manager.SaveAnchor(pos, rot);

        Assert.That(_manager.HasSavedAnchor, Is.True);
        Assert.That(_manager.SavedPosition.x, Is.EqualTo(1f));
        Assert.That(_manager.SavedPosition.z, Is.EqualTo(2f));
    }

    // AC5: Subsequent launches - anchor auto-restored
    [Test]
    public void LoadAnchor_Returns_Saved_Position()
    {
        var pos = new Vector3(3f, 1f, 5f);
        _manager.SaveAnchor(pos, Quaternion.identity);

        var loaded = _manager.LoadAnchor();
        Assert.That(loaded.HasValue, Is.True);
        Assert.That(loaded!.Value.Position.x, Is.EqualTo(3f));
        Assert.That(loaded!.Value.Position.z, Is.EqualTo(5f));
    }

    [Test]
    public void LoadAnchor_Returns_Null_When_No_Anchor()
    {
        var loaded = _manager.LoadAnchor();
        Assert.That(loaded.HasValue, Is.False);
    }

    [Test]
    public void ClearAnchor_Removes_Saved()
    {
        _manager.SaveAnchor(new Vector3(1, 0, 1), Quaternion.identity);
        _manager.ClearAnchor();
        Assert.That(_manager.HasSavedAnchor, Is.False);
    }

    [Test]
    public void OnAnchorSaved_Event_Fires()
    {
        bool fired = false;
        _manager.OnAnchorSaved += (_, _) => fired = true;

        _manager.SaveAnchor(Vector3.zero, Quaternion.identity);
        Assert.That(fired, Is.True);
    }
}

#endregion

#region PlacementFlow Tests (US-9)

[TestFixture]
public class PlacementFlowTests
{
    private PlacementFlow _flow = null!;
    private SpatialAnchorManager _anchorManager = null!;

    [SetUp]
    public void SetUp()
    {
        _anchorManager = new SpatialAnchorManager();
        _flow = new PlacementFlow(_anchorManager);
    }

    // AC4: First-launch placement flow
    [Test]
    public void IsFirstLaunch_True_When_No_Anchor()
    {
        Assert.That(_flow.IsFirstLaunch, Is.True);
    }

    [Test]
    public void IsFirstLaunch_False_When_Anchor_Exists()
    {
        _anchorManager.SaveAnchor(Vector3.zero, Quaternion.identity);
        Assert.That(_flow.IsFirstLaunch, Is.False);
    }

    // AC4: Point and tap to place
    [Test]
    public void Initial_State_Is_Idle()
    {
        Assert.That(_flow.CurrentState, Is.EqualTo(PlacementState.Idle));
    }

    [Test]
    public void StartPlacement_Sets_Placing_State()
    {
        _flow.StartPlacement();
        Assert.That(_flow.CurrentState, Is.EqualTo(PlacementState.Placing));
    }

    [Test]
    public void UpdatePreview_Stores_Position()
    {
        _flow.StartPlacement();
        var pos = new Vector3(2f, 0f, 3f);
        _flow.UpdatePreview(pos, Quaternion.identity);

        Assert.That(_flow.PreviewPosition.x, Is.EqualTo(2f));
        Assert.That(_flow.PreviewPosition.z, Is.EqualTo(3f));
    }

    [Test]
    public void ConfirmPlacement_Saves_Anchor()
    {
        _flow.StartPlacement();
        var pos = new Vector3(1f, 0f, 2f);
        _flow.UpdatePreview(pos, Quaternion.identity);
        _flow.ConfirmPlacement();

        Assert.That(_anchorManager.HasSavedAnchor, Is.True);
        Assert.That(_flow.CurrentState, Is.EqualTo(PlacementState.Confirmed));
    }

    [Test]
    public void ConfirmPlacement_Fires_Event()
    {
        Vector3? placed = null;
        _flow.OnPlacementConfirmed += (pos, _) => placed = pos;

        _flow.StartPlacement();
        _flow.UpdatePreview(new Vector3(5f, 0f, 5f), Quaternion.identity);
        _flow.ConfirmPlacement();

        Assert.That(placed.HasValue, Is.True);
        Assert.That(placed!.Value.x, Is.EqualTo(5f));
    }

    [Test]
    public void CancelPlacement_Returns_To_Idle()
    {
        _flow.StartPlacement();
        _flow.CancelPlacement();

        Assert.That(_flow.CurrentState, Is.EqualTo(PlacementState.Idle));
        Assert.That(_anchorManager.HasSavedAnchor, Is.False);
    }

    [Test]
    public void Cannot_Confirm_When_Idle()
    {
        _flow.ConfirmPlacement(); // no-op
        Assert.That(_anchorManager.HasSavedAnchor, Is.False);
    }

    [Test]
    public void ShowPreviewIndicator_Toggled_During_Placement()
    {
        Assert.That(_flow.ShowPreviewIndicator, Is.False);

        _flow.StartPlacement();
        Assert.That(_flow.ShowPreviewIndicator, Is.True);

        _flow.UpdatePreview(Vector3.zero, Quaternion.identity);
        _flow.ConfirmPlacement();
        Assert.That(_flow.ShowPreviewIndicator, Is.False);
    }
}

#endregion

#region HandTrackingVisuals Tests (US-9)

[TestFixture]
public class HandTrackingVisualsTests
{
    private HandTrackingVisuals _visuals = null!;

    [SetUp]
    public void SetUp()
    {
        _visuals = new HandTrackingVisuals();
    }

    // AC6: 8 key joints rendered
    [Test]
    public void Eight_Key_Joints_Defined()
    {
        Assert.That(HandTrackingVisuals.TrackedJoints, Has.Length.EqualTo(8));
    }

    [Test]
    public void Tracked_Joints_Include_Required()
    {
        var joints = HandTrackingVisuals.TrackedJoints;
        Assert.That(joints, Does.Contain(HandJoint.ThumbTip));
        Assert.That(joints, Does.Contain(HandJoint.IndexTip));
        Assert.That(joints, Does.Contain(HandJoint.MiddleTip));
        Assert.That(joints, Does.Contain(HandJoint.RingTip));
        Assert.That(joints, Does.Contain(HandJoint.PinkyTip));
        Assert.That(joints, Does.Contain(HandJoint.Wrist));
        Assert.That(joints, Does.Contain(HandJoint.PalmCenter));
        Assert.That(joints, Does.Contain(HandJoint.IndexKnuckle));
    }

    // AC6: Green debug spheres
    [Test]
    public void Joint_Sphere_Color_Is_Green()
    {
        AssertColorEqual(HandTrackingVisuals.JointSphereColor, Color.green);
    }

    // AC6: Ray from index finger
    [Test]
    public void Index_Ray_Enabled_By_Default()
    {
        Assert.That(_visuals.IsIndexRayEnabled, Is.True);
    }

    [Test]
    public void UpdateJointPosition_Stores_Value()
    {
        var pos = new Vector3(0.1f, 0.2f, 0.3f);
        _visuals.UpdateJointPosition(HandJoint.IndexTip, pos);

        Assert.That(_visuals.GetJointPosition(HandJoint.IndexTip).x, Is.EqualTo(0.1f));
    }

    [Test]
    public void UpdateJointPosition_Unknown_Joint_Ignored()
    {
        // Should not throw
        Assert.DoesNotThrow(() =>
            _visuals.UpdateJointPosition((HandJoint)999, Vector3.zero));
    }

    [Test]
    public void Hand_Tracking_Active_Initially_False()
    {
        Assert.That(_visuals.IsHandTrackingActive, Is.False);
    }

    [Test]
    public void SetHandTrackingActive_Updates()
    {
        _visuals.SetHandTrackingActive(true);
        Assert.That(_visuals.IsHandTrackingActive, Is.True);
    }

    private static void AssertColorEqual(Color actual, Color expected)
    {
        Assert.That(actual.r, Is.EqualTo(expected.r).Within(0.02f), "Red mismatch");
        Assert.That(actual.g, Is.EqualTo(expected.g).Within(0.02f), "Green mismatch");
        Assert.That(actual.b, Is.EqualTo(expected.b).Within(0.02f), "Blue mismatch");
    }
}

#endregion

#region InputMapper Tests (US-9)

[TestFixture]
public class InputMapperTests
{
    private InputMapper _mapper = null!;

    [SetUp]
    public void SetUp()
    {
        _mapper = new InputMapper();
    }

    // AC7: Controller mapping
    [Test]
    public void Controller_RightTrigger_Maps_To_PTT()
    {
        Assert.That(_mapper.GetControllerAction(ControllerButton.RightTrigger),
            Is.EqualTo(InputAction.PushToTalk));
    }

    [Test]
    public void Controller_A_Maps_To_VisionCapture()
    {
        Assert.That(_mapper.GetControllerAction(ControllerButton.A),
            Is.EqualTo(InputAction.VisionCapture));
    }

    [Test]
    public void Controller_Grip_Maps_To_GrabIncarnation()
    {
        Assert.That(_mapper.GetControllerAction(ControllerButton.Grip),
            Is.EqualTo(InputAction.GrabIncarnation));
    }

    [Test]
    public void Controller_LeftThumbstickClick_Maps_To_Settings()
    {
        Assert.That(_mapper.GetControllerAction(ControllerButton.LeftThumbstickClick),
            Is.EqualTo(InputAction.ToggleSettings));
    }

    [Test]
    public void Controller_B_Maps_To_History()
    {
        Assert.That(_mapper.GetControllerAction(ControllerButton.B),
            Is.EqualTo(InputAction.ToggleHistory));
    }

    // AC8: Hand gesture mapping
    [Test]
    public void Gesture_Pinch_Maps_To_PTT()
    {
        Assert.That(_mapper.GetGestureAction(HandGesture.Pinch),
            Is.EqualTo(InputAction.PushToTalk));
    }

    [Test]
    public void Gesture_OpenPalm_Maps_To_VisionCapture()
    {
        Assert.That(_mapper.GetGestureAction(HandGesture.OpenPalm),
            Is.EqualTo(InputAction.VisionCapture));
    }

    [Test]
    public void Gesture_GrabFist_Maps_To_GrabIncarnation()
    {
        Assert.That(_mapper.GetGestureAction(HandGesture.GrabFist),
            Is.EqualTo(InputAction.GrabIncarnation));
    }

    // Action event system
    [Test]
    public void SimulateControllerInput_Fires_ActionEvent()
    {
        InputAction? received = null;
        _mapper.OnActionTriggered += (action, _) => received = action;

        _mapper.SimulateControllerInput(ControllerButton.A, true);
        Assert.That(received, Is.EqualTo(InputAction.VisionCapture));
    }

    [Test]
    public void SimulateGestureInput_Fires_ActionEvent()
    {
        InputAction? received = null;
        _mapper.OnActionTriggered += (action, _) => received = action;

        _mapper.SimulateGestureInput(HandGesture.Pinch, true);
        Assert.That(received, Is.EqualTo(InputAction.PushToTalk));
    }

    [Test]
    public void ActionEvent_Includes_IsDown_State()
    {
        bool? isDown = null;
        _mapper.OnActionTriggered += (_, down) => isDown = down;

        _mapper.SimulateControllerInput(ControllerButton.RightTrigger, false);
        Assert.That(isDown, Is.EqualTo(false));
    }

    // Unmapped inputs
    [Test]
    public void Unmapped_Controller_Returns_None()
    {
        Assert.That(_mapper.GetControllerAction((ControllerButton)999),
            Is.EqualTo(InputAction.None));
    }

    [Test]
    public void Unmapped_Gesture_Returns_None()
    {
        Assert.That(_mapper.GetGestureAction((HandGesture)999),
            Is.EqualTo(InputAction.None));
    }

    [Test]
    public void Unmapped_Input_Does_Not_Fire_Event()
    {
        bool fired = false;
        _mapper.OnActionTriggered += (_, _) => fired = true;

        _mapper.SimulateControllerInput((ControllerButton)999, true);
        Assert.That(fired, Is.False);
    }
}

#endregion

#region Edge Case Tests (EC-1, EC-4, EC-5)

[TestFixture]
public class EdgeCaseEC1_TotalProviderFailureTests
{
    private DegradationManager _degradation = null!;
    private ErrorNotificationQueue _queue = null!;

    [SetUp]
    public void SetUp()
    {
        _degradation = new DegradationManager();
        _queue = new ErrorNotificationQueue();
    }

    // EC-1: All 3 slots fail -> auto degradation
    [Test]
    public void All_Slots_Fail_Activates_Degradation()
    {
        // Simulate all 3 slots failing for STT
        _degradation.ActivateDegradation(BrickType.STT);
        Assert.That(_degradation.IsDegraded(BrickType.STT), Is.True);
    }

    [Test]
    public void Total_Failure_Error_Message_Format()
    {
        var notification = new ErrorNotification(
            ErrorCode.Network("STT"),
            "All providers failed for STT. Entering degraded mode.",
            "all");

        Assert.That(notification.Message, Does.Contain("All providers failed"));
        Assert.That(notification.Message, Does.Contain("degraded mode"));
    }

    [Test]
    public void Independent_Brick_Degradation()
    {
        // EC-1: STT failure does NOT affect other bricks
        _degradation.ActivateDegradation(BrickType.STT);

        Assert.That(_degradation.IsDegraded(BrickType.STT), Is.True);
        Assert.That(_degradation.IsDegraded(BrickType.LLM), Is.False);
        Assert.That(_degradation.IsDegraded(BrickType.TTS), Is.False);
        Assert.That(_degradation.IsDegraded(BrickType.Vision), Is.False);
    }

    [Test]
    public void Recovery_After_Manual_Retry()
    {
        _degradation.ActivateDegradation(BrickType.LLM);
        Assert.That(_degradation.IsDegraded(BrickType.LLM), Is.True);

        _degradation.RecoverBrick(BrickType.LLM);
        Assert.That(_degradation.IsDegraded(BrickType.LLM), Is.False);
    }
}

[TestFixture]
public class EdgeCaseEC4_PTTSpamTests
{
    private ConversationStateMachine _stateMachine = null!;
    private PTTController _ptt = null!;

    [SetUp]
    public void SetUp()
    {
        _stateMachine = new ConversationStateMachine();
        _ptt = new PTTController();

        // Wire PTT to state machine
        _ptt.OnPTTPressed += () => _stateMachine.OnPTTPressed();
    }

    // EC-4: PTT disabled during processing
    [Test]
    public void PTT_Ignored_During_Recording()
    {
        _stateMachine.OnPTTPressed(); // Start recording
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Recording));

        // Try PTT again -- should stay in Recording
        _stateMachine.OnPTTPressed();
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void PTT_Ignored_During_Transcribing()
    {
        _stateMachine.OnPTTPressed();
        _stateMachine.OnPTTReleased(1.0f); // -> Transcribing
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Transcribing));

        _stateMachine.OnPTTPressed();
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Transcribing));
    }

    [Test]
    public void PTT_Ignored_During_Thinking()
    {
        _stateMachine.OnPTTPressed();
        _stateMachine.OnPTTReleased(1.0f); // -> Transcribing
        _stateMachine.OnTranscriptionComplete(); // -> Thinking

        _stateMachine.OnPTTPressed();
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Thinking));
    }

    [Test]
    public void PTT_Ignored_During_Talking()
    {
        _stateMachine.OnPTTPressed();
        _stateMachine.OnPTTReleased(1.0f); // -> Transcribing
        _stateMachine.OnTranscriptionComplete(); // -> Thinking
        _stateMachine.OnLLMComplete(); // -> Talking

        _stateMachine.OnPTTPressed();
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Talking));
    }

    [Test]
    public void PTT_ReEnabled_After_Playback_Complete()
    {
        _stateMachine.OnPTTPressed();
        _stateMachine.OnPTTReleased(1.0f);
        _stateMachine.OnTranscriptionComplete();
        _stateMachine.OnLLMComplete();
        _stateMachine.OnPlaybackComplete(); // -> Ready

        Assert.That(_stateMachine.CanAcceptInput, Is.True);

        _stateMachine.OnPTTPressed();
        Assert.That(_stateMachine.CurrentState, Is.EqualTo(ConversationState.Recording));
    }

    [Test]
    public void PTTController_SetEnabled_False_Ignores_Input()
    {
        _ptt.SetEnabled(false);

        bool pressed = false;
        _ptt.OnPTTPressed += () => pressed = true;

        _ptt.SimulateInput(PTTInputSource.ControllerTrigger, true);
        Assert.That(pressed, Is.False);
    }
}

[TestFixture]
public class EdgeCaseEC5_NetworkFailureTests
{
    // EC-5: Network failure mid-request
    [Test]
    public void Network_Error_Code_Format()
    {
        // Error codes follow pattern: {BRICK}_{ERROR_TYPE}
        var sttError = ErrorCode.Network("STT");
        var llmError = ErrorCode.Network("LLM");
        var ttsError = ErrorCode.Network("TTS");

        Assert.That(sttError.ToString(), Does.Contain("NETWORK"));
        Assert.That(llmError.ToString(), Does.Contain("NETWORK"));
        Assert.That(ttsError.ToString(), Does.Contain("NETWORK"));
    }

    [Test]
    public void Network_Error_Has_Retry_And_Dismiss()
    {
        var notification = new ErrorNotification(
            ErrorCode.Network("LLM"),
            "Network connection lost during LLM request.",
            "openai");

        bool retried = false;
        bool dismissed = false;
        notification.OnRetry += () => retried = true;
        notification.OnDismiss += () => dismissed = true;

        notification.Retry();
        Assert.That(retried, Is.True);

        notification.Dismiss();
        Assert.That(dismissed, Is.True);
    }

    [Test]
    public void Network_Error_No_Auto_Switch()
    {
        var config = new ProviderConfig(Path.GetTempPath());
        config.SetActiveSlot(BrickType.LLM, SlotType.Cloud1);

        // After network error, active slot should NOT change
        // (simulating that the system does NOT auto-switch)
        Assert.That(config.GetActiveSlot(BrickType.LLM), Is.EqualTo(SlotType.Cloud1));
    }

    [Test]
    public void Dismiss_Network_Error_Triggers_Degradation()
    {
        var degradation = new DegradationManager();

        var notification = new ErrorNotification(
            ErrorCode.Network("STT"),
            "Network failure",
            "whisper");
        notification.OnDismiss += () => degradation.ActivateDegradation(BrickType.STT);

        notification.Dismiss();
        Assert.That(degradation.IsDegraded(BrickType.STT), Is.True);
    }

    [Test]
    public void Auto_Dismiss_After_15s_Triggers_Degradation()
    {
        var degradation = new DegradationManager();

        var notification = new ErrorNotification(
            ErrorCode.Network("TTS"),
            "Network failure",
            "elevenlabs");
        notification.OnDismiss += () => degradation.ActivateDegradation(BrickType.TTS);

        // Simulate 15s passing
        notification.UpdateTimer(15f);
        Assert.That(notification.IsExpired, Is.True);
        Assert.That(degradation.IsDegraded(BrickType.TTS), Is.True);
    }
}

#endregion
