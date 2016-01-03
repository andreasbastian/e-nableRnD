var stlFileLocations = {
    proximal: "../batch%20STL%20sizing/proximal%200.2mm/<%= hand %>_para_prox_<%= size %>.stl",
    distal: "../batch%20STL%20sizing/distal/old/<%= hand %>_distal_scale_<%= size %>_percent.stl",
    palm: "../batch%20STL%20sizing/<%= hand %>_palm/<%= hand %>_palm_<%= handName %>_<%= size %>.stl"
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

function loadHand(hand,size){
    var fileNames = generateFileNames(hand,size);

    // load palm
    var palmrotation = new THREE.Euler( -Math.PI / 2, Math.PI,Math.PI, 'XYZ' );
    var offsetPalm = new THREE.Vector3(25,0,-120);
    loadPalm(fileNames.palm,offsetPalm,palmrotation);

    // load proximals
    var rotationProximal = new THREE.Euler( -Math.PI / 2, Math.PI,0, 'XYZ' );
    var offsetProximal = new THREE.Vector3(0,0,-10);
    loadKnuckles(fileNames.proximal,15,offsetProximal,rotationProximal);

    // load distals
    var rotationDistal = new THREE.Euler( Math.PI / 2, Math.PI , Math.PI / 2, 'XYZ' );
    var offsetDistal = new THREE.Vector3(-3,0,10);
    loadKnuckles(fileNames.distal,15,offsetDistal,rotationDistal);
}

function getMaterial(){
    return new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
}

function loadPalm(filename,offset,rotation){
    var loader = new THREE.STLLoader();
    loader.load( filename, function ( geometry ) {

        var mesh = new THREE.Mesh( geometry, getMaterial() );
        mesh.rotation.set(rotation.x,rotation.y,rotation.z );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(offset.x,offset.y,offset.z);
        scene.add( mesh );

        render();
    } );
}

function loadKnuckles(fileName,spacingX,offset,rotation){
    var loader = new THREE.STLLoader();
    loader.load( fileName, function ( geometry ) {

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

        render();
    } );
}