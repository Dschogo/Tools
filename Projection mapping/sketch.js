/*
 * Video Mapper with Corner Handles - Multiple Videos Support
 * Based on p5.mapper library
 * Allows loading multiple video files and positioning them with draggable corner handles
 */

let pMapper;
let videos = []; // Array to store multiple video objects
let selectedVideoIndex = -1; // Index of currently selected video
let isCalibrating = false;
let kioskMode = false; // Toggle for hiding UI

// Video object structure:
// {
//   id: unique identifier,
//   name: filename,
//   video: p5 video object,
//   quadMap: p5.mapper quad,
//   isPlaying: boolean,
//   url: blob URL for cleanup,
//   isMuted: boolean,
//   isHidden: boolean,
//   color: p5 color object for grid/corner points
// }

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);

    // Create projection mapper
    pMapper = createProjectionMapper(this);

    // Start calibration mode by default so user can see the handles
    pMapper.startCalibration();
    isCalibrating = true;

    // Set up video file input event listener
    setupVideoFileInput();

    console.log("Multi-Video Mapper initialized. Add video files to begin.");
}

function draw() {
    background(0);

    // Ensure pMapper knows about all active video surfaces for proper interaction
    const activeSurfaces = [];
    videos.forEach((videoObj) => {
        if (videoObj.quadMap && !videoObj.isHidden) {
            activeSurfaces.push(videoObj.quadMap);
        }
    });
    pMapper.surfaces = activeSurfaces;

    // Update mapper events for interaction
    pMapper.updateEvents();

    // Check which video is being interacted with and select it
    if (pMapper.selected && isCalibrating) {
        const selectedSurface = pMapper.selected;
        const videoIndex = videos.findIndex((v) => v.quadMap === selectedSurface);
        if (videoIndex >= 0 && videoIndex !== selectedVideoIndex) {
            selectVideo(videoIndex);
        }
    }

    for (let i = 0; i < videos.length; i++) {
        const videoObj = videos[i];
        if (videoObj.video && videoObj.quadMap && !videoObj.isHidden) {
            videoObj.quadMap.displayTexture(videoObj.video);
            videoObj.quadMap.calculateMesh();
        }
    }
    
    // Display control points only for the selected video to solve z-order issues
    if (isCalibrating && selectedVideoIndex >= 0 && videos[selectedVideoIndex] && !videos[selectedVideoIndex].isHidden) {
        const selectedVideo = videos[selectedVideoIndex];

        // Set the color for the control points
        if (selectedVideo.color) {
            selectedVideo.quadMap.controlPointColor = selectedVideo.color;
        }

        selectedVideo.quadMap.displayControlPoints();


    }
    // hide all other controlpoints
    for (let i = 0; i < videos.length; i++) {
        const videoObj = videos[i];
        if (videoObj.quadMap && i !== selectedVideoIndex) {
            // Hide control points for non-selected videos
            videoObj.quadMap.controlPointColor = color(0, 0, 0, 0); // Transparent color
        }
    }
}

function setupVideoFileInput() {
    const fileInput = document.getElementById("videoFile");
    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            addVideoFile(file);
            // Clear the input so the same file can be added again if needed
            fileInput.value = "";
        }
    });
}

function addVideoFile(file) {
    // Create unique ID for this video
    const videoId = Date.now() + Math.random();

    // Create URL for the file
    const url = URL.createObjectURL(file);

    // Create new video element
    const video = createVideo([url]);
    video.hide(); // Hide the HTML video element
    video.loop(); // Set to loop
    video.volume(1); // Set volume
    video.pause(); // Start paused, not playing

    // Generate a random color for this video's grid/corner points
    const videoColor = color(random(100, 255), random(100, 255), random(100, 255));

    // Create video object
    const videoObj = {
        id: videoId,
        name: file.name,
        video: video,
        quadMap: null,
        isPlaying: false,
        url: url,
        isMuted: false,
        isHidden: false,
        color: videoColor,
    };

    // Add to videos array
    videos.push(videoObj);
    const videoIndex = videos.length - 1;

    // Wait for video metadata to load
    video.elt.addEventListener("loadedmetadata", function () {
        console.log(`Video loaded: ${file.name} (${video.width}x${video.height})`);

        // Create quad map for this video
        videoObj.quadMap = pMapper.createQuadMap(video.width, video.height);

        // Set the color for the quad map's control points
        videoObj.quadMap.controlPointColor = videoObj.color;

        // Wait a frame before positioning to ensure quad is fully initialized
        setTimeout(() => {
            resetQuadPosition(videoObj.quadMap, video);

            // Select this video
            selectVideo(videoIndex);

            // play video
            video.play();
            videoObj.isPlaying = true;

            // Update the video list UI
            updateVideoListUI();

            console.log("Video ready! Click to play or use controls.");
        }, 100); // Small delay to ensure proper initialization
    });

    video.elt.addEventListener("error", function (e) {
        console.error("Error loading video:", e);
        alert("Error loading video file. Please try a different format.");
        // Remove the failed video from the array
        const index = videos.findIndex((v) => v.id === videoId);
        if (index >= 0) {
            videos.splice(index, 1);
            updateVideoListUI();
        }
    });
}

function selectVideo(index) {
    if (index >= 0 && index < videos.length) {
        selectedVideoIndex = index;
        console.log(`Selected video: ${videos[index].name}`);
        updateVideoListUI();
    }
}

function muteVideo(index) {
    if (index >= 0 && index < videos.length) {
        const videoObj = videos[index];
        videoObj.isMuted = !videoObj.isMuted;

        if (videoObj.isMuted) {
            videoObj.video.volume(0);
        } else {
            videoObj.video.volume(0.5);
        }

        updateVideoListUI();
        console.log(`Video ${videoObj.isMuted ? "muted" : "unmuted"}: ${videoObj.name}`);
    }
}

function hideVideo(index) {
    if (index >= 0 && index < videos.length) {
        const videoObj = videos[index];
        videoObj.isHidden = !videoObj.isHidden;

        updateVideoListUI();
        console.log(`Video ${videoObj.isHidden ? "hidden" : "shown"}: ${videoObj.name}`);
    }
}

function moveVideoUp(index) {
    if (index > 0 && index < videos.length) {
        // Swap with the video above (move towards foreground)
        const temp = videos[index];
        videos[index] = videos[index - 1];
        videos[index - 1] = temp;

        // Update selected index if needed
        if (selectedVideoIndex === index) {
            selectedVideoIndex = index - 1;
        } else if (selectedVideoIndex === index - 1) {
            selectedVideoIndex = index;
        }

        updateVideoListUI();
        console.log(`Moved video up: ${temp.name}`);
    }
}

function moveVideoDown(index) {
    if (index >= 0 && index < videos.length - 1) {
        // Swap with the video below (move towards background)
        const temp = videos[index];
        videos[index] = videos[index + 1];
        videos[index + 1] = temp;

        // Update selected index if needed
        if (selectedVideoIndex === index) {
            selectedVideoIndex = index + 1;
        } else if (selectedVideoIndex === index + 1) {
            selectedVideoIndex = index;
        }

        updateVideoListUI();
        console.log(`Moved video down: ${temp.name}`);
    }
}

function toggleKioskMode() {
    kioskMode = !kioskMode;
    const controls = document.querySelector(".controls");
    const instructions = document.querySelector(".instructions");

    if (kioskMode) {
        controls.style.display = "none";
        instructions.style.display = "none";
        console.log("Kiosk mode ON - UI hidden");
    } else {
        controls.style.display = "block";
        instructions.style.display = "block";
        console.log("Kiosk mode OFF - UI visible");
    }
}

function deleteVideo(index) {
    if (index >= 0 && index < videos.length) {
        const videoObj = videos[index];

        // Remove the quadMap from pMapper surfaces array to clean up corner points
        if (videoObj.quadMap && pMapper.surfaces) {
            const surfaceIndex = pMapper.surfaces.indexOf(videoObj.quadMap);
            if (surfaceIndex >= 0) {
                pMapper.surfaces.splice(surfaceIndex, 1);
            }
        }

        // Clean up video resources
        if (videoObj.video) {
            videoObj.video.remove();
        }
        if (videoObj.url) {
            URL.revokeObjectURL(videoObj.url);
        }

        // Remove from videos array
        videos.splice(index, 1);

        // Adjust selected index
        if (selectedVideoIndex === index) {
            selectedVideoIndex = videos.length > 0 ? Math.min(selectedVideoIndex, videos.length - 1) : -1;
        } else if (selectedVideoIndex > index) {
            selectedVideoIndex--;
        }

        // Update UI
        updateVideoListUI();
        console.log(`Deleted video: ${videoObj.name}`);
    }
}

function updateVideoListUI() {
    const videoList = document.getElementById("videoList");

    if (videos.length === 0) {
        videoList.innerHTML = '<div style="padding: 8px; text-align: center; color: #888; font-style: italic;">No videos loaded</div>';
        return;
    }

    let html = "";
    videos.forEach((videoObj, index) => {
        const isSelected = index === selectedVideoIndex;
        let status = "Paused";
        if (videoObj.isPlaying) status = "Playing";
        if (videoObj.isHidden) status = "Hidden";
        if (videoObj.isMuted && !videoObj.isHidden) status += " (Muted)";

        // Get the color as RGB values for CSS
        const r = red(videoObj.color);
        const g = green(videoObj.color);
        const b = blue(videoObj.color);
        const colorStyle = `rgb(${r}, ${g}, ${b})`;

        const opacity = videoObj.isHidden ? "0.5" : "1";

        html += `
            <div class="video-item ${isSelected ? "selected" : ""}" onclick="selectVideoFromUI(${index})" style="opacity: ${opacity}">
                <div class="video-color-indicator" style="background-color: ${colorStyle}; width: 12px; height: 12px; border-radius: 2px; margin-right: 8px; flex-shrink: 0;"></div>
                <div class="video-item-name" title="${videoObj.name}">
                    ${videoObj.name} (${status})
                </div>
                <div class="video-item-controls">
                    <button onclick="event.stopPropagation(); moveVideoUpFromUI(${index})" ${index === 0 ? "disabled" : ""} title="Move to foreground">↑</button>
                    <button onclick="event.stopPropagation(); moveVideoDownFromUI(${index})" ${index === videos.length - 1 ? "disabled" : ""} title="Move to background">↓</button>
                    <button onclick="event.stopPropagation(); toggleVideoPlayback(${index})" ${videoObj.isHidden ? "disabled" : ""}>${videoObj.isPlaying ? "⏸" : "▶"}</button>
                    <button onclick="event.stopPropagation(); muteVideoFromUI(${index})" title="${videoObj.isMuted ? "Unmute" : "Mute"}">${videoObj.isMuted ? "🔇" : "🔊"}</button>
                    <button onclick="event.stopPropagation(); hideVideoFromUI(${index})" title="${videoObj.isHidden ? "Show" : "Hide"}">${videoObj.isHidden ? "👁" : "🙈"}</button>
                    <button class="delete" onclick="event.stopPropagation(); deleteVideoFromUI(${index})">×</button>
                </div>
            </div>
        `;
    });

    videoList.innerHTML = html;
}

function resetQuadPosition(quadMap, video) {
    if (!quadMap) return;

    // Calculate a reasonable scale based on window size and video dimensions
    let scale = 0.25; // Even smaller initial scale
    let quadWidth = 300; // Default size
    let quadHeight = 200;

    if (video && video.width > 0 && video.height > 0) {
        // Calculate scale to fit nicely in window
        const maxSize = Math.min(windowWidth, windowHeight) * 0.7; // 30% of smaller dimension
        const videoAspect = video.width / video.height;

        if (videoAspect > 1) {
            // Wide video
            quadWidth = maxSize;
            quadHeight = maxSize / videoAspect;
        } else {
            // Tall video
            quadHeight = maxSize;
            quadWidth = maxSize * videoAspect;
        }

        scale = quadWidth / video.width;
    }

    // Add offset for multiple videos so they don't stack
    const videoIndex = videos.findIndex((v) => v.quadMap === quadMap);
    const offset = videoIndex * 50; // Larger offset for better separation

    // Position quad corners in screen space (WEBGL coordinates with origin at center)
    const left = -quadWidth / 2 + offset;
    const right = quadWidth / 2 + offset;
    const top = -quadHeight / 2 + offset;
    const bottom = quadHeight / 2 + offset;

    console.log(quadMap);
    // Set the four corners of the quad with explicit coordinate assignment
    if (quadMap.controlPoints && quadMap.controlPoints.length >= 4) {
        // Ensure anchors exist and are properly initialized
        quadMap.controlPoints.forEach((anchor, i) => {
            if (!anchor) {
                console.error(`Anchor ${i} is null or undefined`);
                return;
            }
        });

        quadMap.controlPoints[0].x = left; // Top-left
        quadMap.controlPoints[0].y = top;
        quadMap.controlPoints[1].x = right; // Top-right
        quadMap.controlPoints[1].y = top;
        quadMap.controlPoints[2].x = right; // Bottom-right
        quadMap.controlPoints[2].y = bottom;
        quadMap.controlPoints[3].x = left; // Bottom-left
        quadMap.controlPoints[3].y = bottom;

        //console.log(`Reset quad ${videoIndex}: ${quadWidth.toFixed(0)}x${quadHeight.toFixed(0)} at (${left.toFixed(0)},${top.toFixed(0)}) scale=${scale.toFixed(3)}`);
    } else {
        console.error("QuadMap anchors not properly initialized");
    }
}

function toggleCalibration() {
    pMapper.toggleCalibration();
    isCalibrating = !isCalibrating;
    console.log(`Calibration mode: ${isCalibrating ? "ON" : "OFF"}`);
}

function togglePlayback() {
    if (selectedVideoIndex < 0 || !videos[selectedVideoIndex]) {
        console.log("No video selected");
        return;
    }

    const videoObj = videos[selectedVideoIndex];

    if (videoObj.isPlaying) {
        videoObj.video.pause();
        videoObj.isPlaying = false;
        console.log("Video paused");
    } else {
        videoObj.video.play();
        videoObj.isPlaying = true;
        console.log("Video playing");
    }

    updateVideoListUI();
}

function toggleVideoPlayback(index) {
    if (index >= 0 && index < videos.length) {
        const videoObj = videos[index];

        if (videoObj.isPlaying) {
            videoObj.video.pause();
            videoObj.isPlaying = false;
        } else {
            videoObj.video.play();
            videoObj.isPlaying = true;
        }

        updateVideoListUI();
    }
}

function toggleFullscreen() {
    let fs = fullscreen();
    fullscreen(!fs);
}

// Keyboard controls
function keyPressed() {
    switch (key.toLowerCase()) {
        case "c":
            toggleCalibration();
            break;
        case "f":
            toggleFullscreen();
            break;
        case "p": // Spacebar
            togglePlayback();
            break;
        case "r":
            resetMapping();
            break;
        case "p":
            togglePlayback();
            break;
        case "k":
            toggleKioskMode();
            break;
        case "m": // Mute selected video
            if (selectedVideoIndex >= 0 && videos[selectedVideoIndex]) {
                muteVideo(selectedVideoIndex);
            }
            break;
        case "h": // Hide selected video
            if (selectedVideoIndex >= 0 && videos[selectedVideoIndex]) {
                hideVideo(selectedVideoIndex);
            }
            break;
        case "w": // Move selected video up (foreground)
            if (selectedVideoIndex > 0) {
                moveVideoUp(selectedVideoIndex);
            }
            break;
        case "s": // Move selected video down (background)
            if (selectedVideoIndex < videos.length - 1) {
                moveVideoDown(selectedVideoIndex);
            }
            break;
    }
}

// Mouse controls
function mousePressed() {
    if (isCalibrating) {
        // In calibration mode, check which video was clicked
        // Check from top to bottom (reverse order since last rendered is on top)
        for (let i = videos.length - 1; i >= 0; i--) {
            const videoObj = videos[i];
            if (videoObj.quadMap && !videoObj.isHidden) {
                // Check if mouse is over this video's quad
                if (videoObj.quadMap.isMouseOver && videoObj.quadMap.isMouseOver()) {
                    selectVideo(i);
                    break;
                }
            }
        }
    }
}

function resetMapping() {
    if (selectedVideoIndex >= 0 && videos[selectedVideoIndex]) {
        resetQuadPosition(videos[selectedVideoIndex].quadMap, videos[selectedVideoIndex].video);
        console.log("Mapping reset for selected video");
    } else {
        console.log("No video selected");
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Don't auto-reset position on resize to preserve user's mapping
}

// Global functions for UI controls
window.toggleCalibration = toggleCalibration;
window.togglePlayback = togglePlayback;
window.resetMapping = resetMapping;
window.toggleFullscreen = toggleFullscreen;
window.selectVideoFromUI = selectVideo;
window.deleteVideoFromUI = deleteVideo;
window.toggleVideoPlayback = toggleVideoPlayback;
window.muteVideoFromUI = muteVideo;
window.hideVideoFromUI = hideVideo;
window.moveVideoUpFromUI = moveVideoUp;
window.moveVideoDownFromUI = moveVideoDown;
window.toggleKioskMode = toggleKioskMode;
