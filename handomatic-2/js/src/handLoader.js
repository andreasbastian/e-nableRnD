var HandLoader = (function(){
    var stlFileLocations = {
        proximal: "../batch%20STL%20sizing/proximal%200.2mm/<%= hand %>_para_prox_<%= size %>.stl",
        distal: "../batch%20STL%20sizing/distal/old/<%= hand %>_distal_scale_<%= size %>_percent.stl",
        palm: "../batch%20STL%20sizing/<%= hand %>_palm/<%= hand %>_palm_<%= handName %>_<%= size %>.stl"
    };

    var blobsForDownload = {
        palm: "",
        proximal: "",
        distal: ""
    };

    function generateFileNames(hand,size){
        if (hand !== "RR" && hand !== "LL") throw new Error("Expected hand to be either RR or LL");
        if (typeof size != "number" || size < 100 || size > 200) throw new Error("Expected size to be a number between 100 and 200")

        var handParameters = {
            size: size,
            hand: hand,
            handName: hand === "RR" ? "right" : "left"
        };

        return {
            proximal: _.template(stlFileLocations.proximal)(handParameters),
            distal: _.template(stlFileLocations.distal)(handParameters),
            palm: _.template(stlFileLocations.palm)(handParameters)
        }
    }

    function getMaterial(){
        return new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
    }

    function loadPalm(filename,offset,rotation,cb){
        var loader = new THREE.STLLoader();
        loader.load( filename, function ( geometry, data ) {
            // Store for later download in a zip file. XHR is the only way to retrieve
            // data from a url as a blob, and it's been done here anyways
            blobsForDownload.palm = data;

            var mesh = new THREE.Mesh( geometry, getMaterial() );
            mesh.rotation.set(rotation.x,rotation.y,rotation.z );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.set(offset.x,offset.y,offset.z);
            scene.add( mesh );

            if (cb) cb(data);
        } );
    }

    function loadKnuckles(fileName,spacingX,offset,rotation,whichKnuckle,cb){
        var loader = new THREE.STLLoader();
        loader.load( fileName, function ( geometry, data ) {
            // Store for later download in a zip file. XHR is the only way to retrieve
            // data from a url as a blob, and it's been done here anyways
            blobsForDownload[whichKnuckle] = data;

            var mesh = new THREE.Mesh( geometry, getMaterial() );
            mesh.rotation.set(rotation.x,rotation.y,rotation.z );
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Don't add original
            //scene.add( mesh );

            // Duplicate the part and position each knuckle:
            for (var i=0; i<4; i++) {
                var proximalNext = mesh.clone();
                proximalNext.position.set(spacingX*i + offset.x,offset.y,offset.z);
                scene.add(proximalNext);
            }

            if (cb) cb(data);
        } );
    }

    var partsLoaded = 0,
        totalParts = 3,
        handLoadedCallback = function(){},
        completionCheck = function(){
            partsLoaded++;
            if (partsLoaded === totalParts){
                handLoadedCallback(blobsForDownload)
            } else {
                // Still waiting for parts to come back
            }
        };

    return {
        loadHand : function(hand,size,cb){
            blobsForDownload = {};
            partsLoaded = 0;
            handLoadedCallback = cb;
            var fileNames = generateFileNames(hand,size);

            var previewScaleFactor = size/100;

            // load palm
            var palmrotation = new THREE.Euler( -Math.PI / 2, Math.PI,Math.PI, 'XYZ' );
            var offsetPalm = new THREE.Vector3(25*previewScaleFactor,0,-120*previewScaleFactor);
            loadPalm(fileNames.palm,offsetPalm,palmrotation,completionCheck);

            // load proximals
            var rotationProximal = new THREE.Euler( -Math.PI / 2, Math.PI,0, 'XYZ' );
            var offsetProximal = new THREE.Vector3(0,0,-10);
            loadKnuckles(fileNames.proximal,15*previewScaleFactor,offsetProximal,rotationProximal, "proximal",completionCheck);

            // load distals
            var rotationDistal = new THREE.Euler( Math.PI / 2, Math.PI , Math.PI / 2, 'XYZ' );
            var offsetDistal = new THREE.Vector3(-3,0,10*previewScaleFactor);
            loadKnuckles(fileNames.distal,15*previewScaleFactor,offsetDistal,rotationDistal,"distal",completionCheck);

            return fileNames;
        },
        getFiles: function(successCallback,errorCallback){
            // THREE.js sets the XHR "responseType" to "arraybuffer" (see STLLoader.js)
            // To put these files in a zip archive we need blobs.
            // Fortunately, support for 'new Blob()' is quite strong
            // See http://caniuse.com/#search=Blob

            // Only download those files > 1kb, since 404s will not result in errors via
            // THREE.loader. Instead, just catch them here, as it should be obvious to the user
            // that something is missing

            var files = [],errors = [],elements = [
                "palm", "distal", "proximal"
            ];

            function verifyElementAndAdd(elementName,arrayBuffers){
                var niceElementName = elementName.charAt(0).toUpperCase() + elementName.slice(1);

                if (arrayBuffers[elementName].byteLength > 1000) {
                    files.push({
                        name: niceElementName + "_" + specs.hand + "_" + specs.size + ".stl",
                        blob: new Blob([arrayBuffers[elementName]], {type: "application/sla"})
                    });
                } else {
                    errors.push("The "+niceElementName+" you requested could not be found");
                }
            }

            // Add all the hand parts to the zip file
            _.each(elements,function(element){
                verifyElementAndAdd(element,blobsForDownload);
            });

            if (errors.length > 0 && errorCallback) {
                errorCallback(errors);
            }
            if (files.length > 0 && successCallback) {
                successCallback(files);
            }
            return files;
        }
    };

})();