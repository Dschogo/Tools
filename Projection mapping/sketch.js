/*
 * Video Mapper with Corner Handles - Multiple Videos Support
 * Based on p5.mapper library
 * Allows loading multiple video files and positioning them with draggable corner handles
 */

let pMapper;
let videos = []; // Array to store multiple video objects
let selectedVideoIndex = -1; // Index of currently selected video
let selectedControlPointIndex = -1; // Index of currently selected control point (-1 means none selected)
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
    // Create a larger virtual canvas to support 8K videos
    // Use the maximum of current screen size and 8K dimensions
    const canvasWidth = Math.max(windowWidth, 3840 * 2); // 8K width
    const canvasHeight = Math.max(windowHeight, 2160 * 2); // 8K height

    createCanvas(canvasWidth, canvasHeight, WEBGL);

    // Create projection mapper with explicit buffer size for 8K support
    pMapper = createProjectionMapper(this, 3840 * 2, 2160 * 2);

    // Start calibration mode by default so user can see the handles
    pMapper.startCalibration();
    isCalibrating = true;

    console.log("Multi-Video Mapper initialized. Add video files to begin.");
    console.log(`Canvas size: ${canvasWidth}x${canvasHeight} (supports up to 4K videos)`);
}

function windowResized() {
    // Maintain 4K support even when window is resized
    resizeCanvas(canvasWidth, canvasHeight);
    // Don't auto-reset position on resize to preserve user's mapping
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
    
    // Completely override any library control point rendering
    if (pMapper.surfaces) {
        pMapper.surfaces.forEach(surface => {
            if (surface.displayControlPoints) {
                surface.displayControlPoints = function() {
                    // Empty function to prevent library control points
                };
            }
        });
    }

    // Check which video is being interacted with and select it
    if (pMapper.selected && isCalibrating) {
        const selectedSurface = pMapper.selected;
        const videoIndex = videos.findIndex((v) => v.quadMap === selectedSurface);
        if (videoIndex >= 0 && videoIndex !== selectedVideoIndex) {
            selectVideo(videoIndex);
        }
    }

    for (let i = 0; i < videos.length; i++) {
        const obj = videos[i];
        if (obj.quadMap && !obj.isHidden) {
            if (obj.isImage && obj.image) {
                obj.quadMap.displayTexture(obj.image);
            } else if (obj.video) {
                obj.quadMap.displayTexture(obj.video);
            }
            obj.quadMap.calculateMesh();
        }
    }
    // Display control points only for the selected item
    if (isCalibrating && selectedVideoIndex >= 0 && videos[selectedVideoIndex] && !videos[selectedVideoIndex].isHidden) {
        const selectedObj = videos[selectedVideoIndex];
        
        // Hide the library's control points by making them transparent
        selectedObj.quadMap.controlPointColor = color(0, 0, 0, 0);
        
        // Draw our custom control points instead
        drawCustomControlPoints(selectedObj);
    }
    
    // Hide all other control points completely
    for (let i = 0; i < videos.length; i++) {
        const obj = videos[i];
        if (obj.quadMap) {
            obj.quadMap.controlPointColor = color(0, 0, 0, 0);
            // Also override hover colors and sizes if they exist
            if (obj.quadMap.controlPointHoverColor) {
                obj.quadMap.controlPointHoverColor = color(0, 0, 0, 0);
            }
            if (obj.quadMap.controlPointSize !== undefined) {
                obj.quadMap.controlPointSize = 0;
            }
        }
    }
}

// Add image file support
function addImageFile(file) {
    const imageId = Date.now() + Math.random();
    const url = URL.createObjectURL(file);
    loadImage(
        url,
        (img) => {
            // Generate a random color for this image's grid/corner points
            const imageColor = color(random(100, 255), random(100, 255), random(100, 255));
            const imageObj = {
                id: imageId,
                name: file.name,
                image: img,
                quadMap: null,
                isImage: true,
                url: url,
                isHidden: false,
                color: imageColor,
            };
            videos.push(imageObj);
            const imageIndex = videos.length - 1;
            // Create quad map for this image
            imageObj.quadMap = pMapper.createQuadMap(img.width, img.height);
            
            // Completely override the library's control point rendering
            imageObj.quadMap.displayControlPoints = function() {
                // Empty function to prevent any library control points from showing
            };
            
            imageObj.quadMap.controlPointColor = imageObj.color;
            setTimeout(() => {
                resetQuadPosition(imageObj.quadMap, img);
                selectVideo(imageIndex);
                updateVideoListUI();
                console.log("Image ready! Use controls to map.");
            }, 100);
        },
        (err) => {
            alert("Error loading image file. Please try a different format.");
            URL.revokeObjectURL(url);
        }
    );
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
        metadataHandler: null, // Will store reference to metadata event handler
        errorHandler: null,    // Will store reference to error event handler
    };

    // Add to videos array
    videos.push(videoObj);
    const videoIndex = videos.length - 1;

    // Wait for video metadata to load
    videoObj.metadataHandler = function () {
        console.log(`Video loaded: ${file.name} (${video.width}x${video.height})`);

        // Create quad map for this video
        videoObj.quadMap = pMapper.createQuadMap(video.width, video.height);

        // Completely override the library's control point rendering
        videoObj.quadMap.displayControlPoints = function() {
            // Empty function to prevent any library control points from showing
        };

        console.log(videoObj);

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
        }, 10); // Small delay to ensure proper initialization
    };
    video.elt.addEventListener("loadedmetadata", videoObj.metadataHandler);

    videoObj.errorHandler = function (e) {
        console.error("Error loading video:", e);
        alert("Error loading video file. Please try a different format.");
        // Remove the failed video from the array
        const index = videos.findIndex((v) => v.id === videoId);
        if (index >= 0) {
            videos.splice(index, 1);
            updateVideoListUI();
        }
    };
    video.elt.addEventListener("error", videoObj.errorHandler);
}

function selectVideo(index) {
    if (index >= 0 && index < videos.length) {
        selectedVideoIndex = index;
        selectedControlPointIndex = -1; // Clear selected control point when switching videos
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
            // Remove event listeners before destroying the video to prevent error events
            videoObj.video.elt.removeEventListener("error", videoObj.errorHandler);
            videoObj.video.elt.removeEventListener("loadedmetadata", videoObj.metadataHandler);
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
        videoList.innerHTML = '<div style="padding: 8px; text-align: center; color: #888; font-style: italic;">No videos or images loaded</div>';
        return;
    }
    let html = "";
    videos.forEach((obj, index) => {
        const isSelected = index === selectedVideoIndex;
        let status = obj.isImage ? "Image" : "Paused";
        if (!obj.isImage) {
            if (obj.isPlaying) status = "Playing";
            if (obj.isHidden) status = "Hidden";
            if (obj.isMuted && !obj.isHidden) status += " (Muted)";
        } else {
            if (obj.isHidden) status = "Hidden";
        }
        // Get the color as RGB values for CSS
        const r = red(obj.color);
        const g = green(obj.color);
        const b = blue(obj.color);
        const colorStyle = `rgb(${r}, ${g}, ${b})`;
        const opacity = obj.isHidden ? "0.5" : "1";
        html += `
            <div class="video-item ${isSelected ? "selected" : ""}" onclick="selectVideoFromUI(${index})" style="opacity: ${opacity}">
                <div class="video-color-indicator" style="background-color: ${colorStyle}; width: 12px; height: 12px; border-radius: 2px; margin-right: 8px; flex-shrink: 0;"></div>
                <div class="video-item-name" title="${obj.name}">
                    ${obj.name} (${status})
                </div>
                <div class="video-item-controls">
                    <button onclick="event.stopPropagation(); moveVideoUpFromUI(${index})" ${index === 0 ? "disabled" : ""} title="Move to foreground">↑</button>
                    <button onclick="event.stopPropagation(); moveVideoDownFromUI(${index})" ${index === videos.length - 1 ? "disabled" : ""} title="Move to background">↓</button>
                    ${!obj.isImage ? `<button onclick=\"event.stopPropagation(); toggleVideoPlayback(${index})\" ${obj.isHidden ? "disabled" : ""}>${obj.isPlaying ? "⏸" : "▶"}</button>` : ""}
                    ${!obj.isImage ? `<button onclick=\"event.stopPropagation(); muteVideoFromUI(${index})\" title=\"${obj.isMuted ? "Unmute" : "Mute"}\">${obj.isMuted ? "🔇" : "🔊"}</button>` : ""}
                    <button onclick="event.stopPropagation(); hideVideoFromUI(${index})" title="${obj.isHidden ? "Show" : "Hide"}">${obj.isHidden ? "👁" : "🙈"}</button>
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

    // Get actual viewport dimensions (visible browser window)
    let viewportWidth = Math.min(windowWidth, window.innerWidth || document.documentElement.clientWidth);
    let viewportHeight = Math.min(windowHeight, window.innerHeight || document.documentElement.clientHeight);

    // If video dimensions are available, adjust quad size accordingly
    if (video && video.width > 0 && video.height > 0) {
        // Calculate scale to fit nicely in viewport
        const maxSize = Math.min(viewportWidth, viewportHeight) * 0.7; // 30% of smaller viewport dimension
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

    console.log("quadWidth:", quadWidth, "quadHeight:", quadHeight, "scale:", scale);
    console.log("viewportWidth:", viewportWidth, "viewportHeight:", viewportHeight);
    console.log("canvasWidth:", width, "canvasHeight:", height);

    // Add offset for multiple videos so they don't stack
    const videoIndex = videos.findIndex((v) => v.quadMap === quadMap);
    const offset = videoIndex * 50; // Larger offset for better separation

    // Calculate viewport center position relative to full canvas
    // In WEBGL, origin is at canvas center, so we need to offset to viewport center
    const viewportCenterX = -(width / 2) + viewportWidth / 2; // Move from canvas center to viewport center
    const viewportCenterY = -(height / 2) + viewportHeight / 2; // Move from canvas center to viewport center

    // Position quad corners relative to viewport center
    const left = viewportCenterX - quadWidth / 2 + offset;
    const right = viewportCenterX + quadWidth / 2 + offset;
    const top = viewportCenterY - quadHeight / 2 + offset;
    const bottom = viewportCenterY + quadHeight / 2 + offset;

    console.log("Positioning quad at viewport center:", viewportCenterX, viewportCenterY);
    console.log("Quad bounds:", left, top, right, bottom);

    // Set the four corners of the quad with explicit coordinate assignment
    if (quadMap.controlPoints && quadMap.controlPoints.length >= 4) {
        // Ensure anchors exist and are properly initialized
        quadMap.controlPoints.forEach((anchor, i) => {
            if (!anchor) {
                console.error(`Anchor ${i} is null or undefined`);
                return;
            }
            // disable controlpoints for now
        });

        quadMap.controlPoints[0].x = left; // Top-left
        quadMap.controlPoints[0].y = top;
        quadMap.controlPoints[1].x = right; // Top-right
        quadMap.controlPoints[1].y = top;
        quadMap.controlPoints[2].x = right; // Bottom-right
        quadMap.controlPoints[2].y = bottom;
        quadMap.controlPoints[3].x = left; // Bottom-left
        quadMap.controlPoints[3].y = bottom;


    } else {
        console.error("QuadMap anchors not properly initialized");
    }
}

function toggleCalibration() {
    pMapper.toggleCalibration();
    isCalibrating = !isCalibrating;
    if (!isCalibrating) {
        selectedControlPointIndex = -1; // Clear selected control point when calibration is turned off
    }
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

// Function to scale selected quad around its center
function scaleSelectedQuad(scaleFactor) {
    if (selectedVideoIndex < 0 || !videos[selectedVideoIndex] || !videos[selectedVideoIndex].quadMap) {
        return;
    }

    const quadMap = videos[selectedVideoIndex].quadMap;
    const controlPoints = quadMap.controlPoints;

    if (!controlPoints || controlPoints.length < 4) {
        return;
    }

    // Calculate the center of the quad
    let centerX = 0;
    let centerY = 0;
    for (let i = 0; i < 4; i++) {
        centerX += controlPoints[i].x;
        centerY += controlPoints[i].y;
    }
    centerX /= 4;
    centerY /= 4;

    // Scale each corner point around the center
    for (let i = 0; i < 4; i++) {
        const deltaX = controlPoints[i].x - centerX;
        const deltaY = controlPoints[i].y - centerY;

        controlPoints[i].x = centerX + deltaX * scaleFactor;
        controlPoints[i].y = centerY + deltaY * scaleFactor;
    }

    console.log(`Scaled selected quad by factor: ${scaleFactor.toFixed(2)}`);
}

// Mouse wheel event for scaling
function mouseWheel(event) {
    if (selectedVideoIndex >= 0 && videos[selectedVideoIndex] && isCalibrating) {
        // Prevent page scrolling
        event.preventDefault();

        // Determine scale factor based on wheel direction
        const scaleFactor = event.delta > 0 ? 0.95 : 1.05; // Smaller increment for smoother scaling

        scaleSelectedQuad(scaleFactor);

        return false; // Prevent default behavior
    }
}

// Keyboard controls
function keyPressed() {
    // Handle arrow keys for moving selected control point
    if (selectedControlPointIndex >= 0 && selectedVideoIndex >= 0 && videos[selectedVideoIndex] && isCalibrating) {
        const videoObj = videos[selectedVideoIndex];
        const controlPoints = videoObj.quadMap.controlPoints;
        
        if (keyCode === UP_ARROW) {
            controlPoints[selectedControlPointIndex].y -= 1;
            console.log(`Moved control point ${selectedControlPointIndex} up by 1 pixel`);
            return false; // Prevent default behavior
        } else if (keyCode === DOWN_ARROW) {
            controlPoints[selectedControlPointIndex].y += 1;
            console.log(`Moved control point ${selectedControlPointIndex} down by 1 pixel`);
            return false;
        } else if (keyCode === LEFT_ARROW) {
            controlPoints[selectedControlPointIndex].x -= 1;
            console.log(`Moved control point ${selectedControlPointIndex} left by 1 pixel`);
            return false;
        } else if (keyCode === RIGHT_ARROW) {
            controlPoints[selectedControlPointIndex].x += 1;
            console.log(`Moved control point ${selectedControlPointIndex} right by 1 pixel`);
            return false;
        }
    }
    
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
        case "+":
        case "=": // Scale up selected quad
            if (selectedVideoIndex >= 0 && videos[selectedVideoIndex]) {
                scaleSelectedQuad(1.1);
            }
            break;
        case "-":
        case "_": // Scale down selected quad
            if (selectedVideoIndex >= 0 && videos[selectedVideoIndex]) {
                scaleSelectedQuad(0.9);
            }
            break;
        case "escape": // Deselect control point
            selectedControlPointIndex = -1;
            console.log("Deselected control point");
            break;
    }
}

// Mouse controls
function mousePressed() {
    if (isCalibrating && selectedVideoIndex >= 0 && videos[selectedVideoIndex] && !videos[selectedVideoIndex].isHidden) {
        const videoObj = videos[selectedVideoIndex];
        const controlPoints = videoObj.quadMap.controlPoints;
        const quadOffsetX = videoObj.quadMap.x || 0;
        const quadOffsetY = videoObj.quadMap.y || 0;
        
        // Calculate mouse position relative to canvas
        const mouseXCanvas = mouseX - width/2;
        const mouseYCanvas = mouseY - height/2;
        
        // Check if mouse clicked on any control point of the selected video
        let clickedControlPoint = -1;
        for (let i = 0; i < controlPoints.length; i++) {
            const point = controlPoints[i];
            const adjustedX = point.x + quadOffsetX;
            const adjustedY = point.y + quadOffsetY;
            const distance = dist(mouseXCanvas, mouseYCanvas, adjustedX, adjustedY);
            if (distance < 12) { // Click radius
                clickedControlPoint = i;
                break;
            }
        }
        
        if (clickedControlPoint >= 0) {
            // Select the control point
            selectedControlPointIndex = clickedControlPoint;
            console.log(`Selected control point ${clickedControlPoint} of video: ${videoObj.name}`);
        } else {
            // Clicked somewhere else, deselect control point
            selectedControlPointIndex = -1;
            
            // Check if mouse is over the video quad to select it
            if (videoObj.quadMap.isMouseOver && videoObj.quadMap.isMouseOver()) {
                selectVideo(selectedVideoIndex); // Refresh selection
            }
        }
    } else if (isCalibrating) {
        // No video selected, check which video was clicked
        selectedControlPointIndex = -1; // Clear any selected control point
        
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
window.addFile = function () {
    // open file input dialog for video/image files
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "video/*,image/*";
    fileInput.multiple = true; // Allow multiple files
    fileInput.onchange = function (event) {
        const files = event.target.files;
        if (files.length === 0) return;

        for (const file of files) {
            if (file.type.startsWith("video/")) {
                addVideoFile(file);
            } else if (file.type.startsWith("image/")) {
                addImageFile(file);
            } else {
                alert("Unsupported file type. Please select a video or image file.");
            }
            console.log(`Added file: ${file.name}`);
        }
    };

    fileInput.click();
};

// Custom control point rendering that uses quadMap x,y offsets for body movement
function drawCustomControlPoints(videoObj) {
    if (!videoObj.quadMap || !videoObj.quadMap.controlPoints) return;
    
    const controlPoints = videoObj.quadMap.controlPoints;
    const quadMap = videoObj.quadMap;
    
    // Get the quad's offset position (this updates when the whole quad is moved)
    const quadOffsetX = quadMap.x || 0;
    const quadOffsetY = quadMap.y || 0;
    
    // Save current drawing state
    push();
    
    // Check if any control point is being hovered or dragged
    let isHovering = false;
    let hoveredIndex = -1;
    
    // Calculate mouse position relative to canvas
    const mouseXCanvas = mouseX - width/2;
    const mouseYCanvas = mouseY - height/2;
    
    // Check for hover on control points (adjusted for quad offset)
    for (let i = 0; i < controlPoints.length; i++) {
        const point = controlPoints[i];
        const adjustedX = point.x + quadOffsetX;
        const adjustedY = point.y + quadOffsetY;
        const distance = dist(mouseXCanvas, mouseYCanvas, adjustedX, adjustedY);
        if (distance < 12) { // Hover radius
            isHovering = true;
            hoveredIndex = i;
            break;
        }
    }
    
    // Draw connecting lines between control points to show quad shape
    stroke(videoObj.color);
    strokeWeight(isHovering ? 2 : 1);
    noFill();
    beginShape();
    for (let i = 0; i < controlPoints.length; i++) {
        const point = controlPoints[i];
        vertex(point.x + quadOffsetX, point.y + quadOffsetY);
    }
    endShape(CLOSE);
    
    // Draw control points at their adjusted positions
    for (let i = 0; i < controlPoints.length; i++) {
        const point = controlPoints[i];
        const isThisHovered = (i === hoveredIndex);
        const isThisSelected = (i === selectedControlPointIndex);
        const adjustedX = point.x + quadOffsetX;
        const adjustedY = point.y + quadOffsetY;
        
        // Determine size and appearance based on state
        let size = 16;
        let strokeColor = color(255);
        let strokeWt = 2;
        
        if (isThisSelected) {
            size = 24;
            strokeColor = color(255, 255, 0); // Yellow border for selected
            strokeWt = 4;
        } else if (isThisHovered) {
            size = 20;
            strokeWt = 3;
        }
        
        // Outer circle (main control point)
        fill(videoObj.color);
        stroke(strokeColor);
        strokeWeight(strokeWt);
        circle(adjustedX, adjustedY, size);
        
        // Inner circle for better visibility
        fill(255);
        noStroke();
        circle(adjustedX, adjustedY, size * 0.5);
        
        // Add a small center dot
        fill(isThisSelected ? color(255, 255, 0) : videoObj.color);
        circle(adjustedX, adjustedY, 4);
        
        // Add selection indicator (pulsing ring for selected point)
        if (isThisSelected) {
            push();
            stroke(255, 255, 0, 150);
            strokeWeight(2);
            noFill();
            let pulseSize = size + 8 + sin(millis() * 0.01) * 4; // Pulsing effect
            circle(adjustedX, adjustedY, pulseSize);
            pop();
        }
    }

    // Restore drawing state
    pop();
}
