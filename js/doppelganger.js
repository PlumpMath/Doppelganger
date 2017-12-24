window.onload = function() {

    // init game
    const gamewidth = 616;
    const gameheight = 308;
    const game = new Phaser.Game(gamewidth, gameheight, Phaser.CANVAS, "doppelganger", {
        preload: preload,
        create: create,
        update: update
    });

    // load resources
    function preload() {
        game.load.spritesheet("player", "img/player.png", 42, 70);
        game.load.spritesheet("doppel", "img/player.png", 42, 70);
        game.load.tilemap("map", "json/map.json", null, Phaser.Tilemap.TILED_JSON);
        game.load.image("tiles", "img/tiles.png");
        game.load.image("tree1", "img/tree1.png");
        game.load.image("tree2", "img/tree2.png");
        game.load.image("tree3", "img/tree3.png");
        game.load.image("tree4", "img/tree4.png");
        game.load.image("bush1", "img/bush1.png");
        game.load.image("bush2", "img/bush2.png");
        game.load.image("bush3", "img/bush3.png");
        game.load.json("trees", "json/trees.json");
        game.load.audio("fall", ["audio/fall.m4a", "audio/fall.ogg"]);
        game.load.audio("hit", ["audio/hit.m4a", "audio/hit.ogg"]);
        game.load.audio("land1", ["audio/land1.m4a", "audio/land1.ogg"]);
        game.load.audio("land2", ["audio/land2.m4a", "audio/land2.ogg"]);
        game.load.audio("step1", ["audio/step1.m4a", "audio/step1.ogg"]);
        game.load.audio("step2", ["audio/step2.m4a", "audio/step2.ogg"]);
        game.load.audio("music", ["audio/music.ogg", "audio/music.m4a"]);
    }

    // create game
    const tilesize = 14;
    const tilemapwidth = 1162;
    const tilemapwidthinpixel = tilesize * tilemapwidth;
    let map;
    let layer;
    let background;
    let player;
    let cursorkeys;
    let doppel;
    let mobilejumpstarted = false;
    let mobilejumpended = false;
    let mobilefaststarted = false;
    let mobilefastended = false;
    let mobileslowstarted = false;
    let mobileslowended = false;

    function create() {
        // game
        game.camera.setSize(gamewidth, gameheight);
        game.renderer.resize(gamewidth, gameheight);
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.physics.arcade.gravity.y = 1500;
        cursorkeys = game.input.keyboard.createCursorKeys();

        // check for mobile
        if (!game.device.desktop) {
            document.getElementById("mobilecontrols").style.display = "block";
            const mobilejumpbutton = document.getElementById("mobilejump");
            const mobilefastbutton = document.getElementById("mobilefast");
            const mobileslowbutton = document.getElementById("mobileslow");
            mobilejumpbutton.addEventListener("touchstart", mobilejumpstart, false);
            mobilejumpbutton.addEventListener("touchend", mobilejumpend, false);
            mobilefastbutton.addEventListener("touchstart", mobilefaststart, false);
            mobilefastbutton.addEventListener("touchend", mobilefastend, false);
            mobileslowbutton.addEventListener("touchstart", mobileslowstart, false);
            mobileslowbutton.addEventListener("touchend", mobileslowend, false);
            game.input.keyboard.enabled = false;
            cursorkeys.up.isDown = false;
            cursorkeys.up.isUp = false;
            cursorkeys.right.isDown = false;
            cursorkeys.right.isUp = false;
            cursorkeys.left.isDown = false;
            cursorkeys.left.isUp = false;
            mobilefastended = true;
        } else {
            game.input.keyboard.enabled = true;
        }

        // background gradient
        background = game.add.bitmapData(tilemapwidthinpixel, gameheight);
        const gradient = background.context.createLinearGradient(0, 0, 0, gameheight);
        gradient.addColorStop(0, "#56544c");
        gradient.addColorStop(1.0, "#ffffff");
        background.context.fillStyle = gradient;
        background.context.fillRect(0, 0, tilemapwidthinpixel, gameheight);
        game.add.sprite(0, 0, background);

        // trees
        const tree1 = {
            width: 205,
            height: 129,
            sprite: "tree1"
        };
        const tree2 = {
            width: 171,
            height: 176,
            sprite: "tree2"
        };
        const tree3 = {
            width: 120,
            height: 174,
            sprite: "tree3"
        };
        const tree4 = {
            width: 110,
            height: 185,
            sprite: "tree4"
        };
        const trees = [tree1, tree2, tree3, tree4];
        const treepos = game.cache.getJSON("trees");
        // plant trees
        while (treepos.length > 0) {
            const min = 1;
            const max = trees.length;
            const randomtree = Math.floor(Math.random() * (max - min) + min);
            const tree = trees[randomtree];
            const pos = treepos.shift();
            const posx = pos.x * tilesize;
            const posy = pos.y * tilesize;
            const offsetx = Math.floor(tree.width / 2);
            const offsety = tree.height;
            game.add.sprite(posx - offsetx, posy - offsety, tree.sprite);
        }

        // bushes
        game.add.sprite(805 * tilesize, 19 * tilesize - 41, "bush3");
        game.add.sprite(811 * tilesize, 19 * tilesize - 59, "bush1");
        game.add.sprite(815 * tilesize, 19 * tilesize - 87, "bush2");
        game.add.sprite(821 * tilesize, 19 * tilesize - 59, "bush1");
        game.add.sprite(823 * tilesize, 19 * tilesize - 59, "bush1");
        game.add.sprite(828 * tilesize, 19 * tilesize - 41, "bush3");
        game.add.sprite(830 * tilesize, 19 * tilesize - 87, "bush2");
        game.add.sprite(838 * tilesize, 19 * tilesize - 41, "bush3");

        // level map
        map = game.add.tilemap("map");
        map.addTilesetImage("tileset", "tiles");
        map.setCollision(5);
        layer = map.createLayer("tilelayer");
        layer.resizeWorld();

        // player
        player = game.add.sprite(0, gameheight / 2, "player");
        player.anchor.setTo(0.5, 0.5);
        runanimation = [0, 1, 2, 3, 4, 5, 6];
        jumpanimation = [7, 8, 9, 10, 11, 12, 13];
        landanimation = [14];
        hitanimation = [15];
        fallanimation = [16];
        player.animations.add("run", runanimation, 10, true);
        player.animations.add("jump", jumpanimation, 10, false);
        player.animations.add("land", landanimation, 10, false);
        player.animations.add("hit", hitanimation, 10, false);
        player.animations.add("fall", fallanimation, 10, false);
        game.physics.enable(player);
        player.body.linearDamping = 1;
        const playerwidth = 42;
        const playerheight = 70;
        player.body.setSize(playerwidth - 15, playerheight - 3, 7, 3);
        game.camera.follow(player);

        // doppelganger
        doppel = game.add.sprite(0, gameheight / 2, "doppel");
        doppel.anchor.setTo(0.5, 0.5);
        doppel.animations.add("run", runanimation, 10, true);
        doppel.animations.add("jump", jumpanimation, 10, false);
        doppel.animations.add("land", landanimation, 10, false);
        doppel.animations.add("hit", hitanimation, 10, false);
        doppel.animations.add("fall", fallanimation, 10, false);
        game.physics.enable(doppel);
        doppel.body.linearDamping = 1;
        doppel.body.setSize(playerwidth - 15, playerheight - 3, 7, 3);
        doppel.alpha = 0;
        doppel.animations.stop();

        // sounds
        landsound1 = game.add.audio("land1");
        landsound2 = game.add.audio("land2");
        stepsound1 = game.add.audio("step1");
        stepsound2 = game.add.audio("step2");
        fallsound = game.add.audio("fall");
        hitsound = game.add.audio("hit");
        music = game.add.audio("music");
        const sounds = [landsound1, landsound2, stepsound1,
            stepsound2, fallsound, hitsound, music
        ];
        game.sound.setDecodedCallback(sounds, start, this);

        // display and start game
        function start() {
            document.getElementById("wrapper").style.display = "none";
            document.getElementById("doppelganger").style.display = "block";
            music.play("", 0, 1, true, false);
        }
    }

    // update game
    let doppelrun = []; // player's recorded run for his doppelganger
    let newdoppelrun = []; // doppelganger's next run
    let olddoppelrun = []; // in case the player was slower than his doppelganger
    let jumprecorded = false; // record jump only once
    let fastrecorded = false; // record fast running only once
    let slowrecorded = false; // record slow running only once
    let doppelstart = false; // emerge doppelganger after player's first run
    let actioncounter = 0; // increment for doppelganger's next action
    let doppeljump = false;
    let doppelfast = false;
    let doppelslow = false;
    let playerisjumping = false;
    let playerishighup = false; // recover player from jump impact
    let doppelishighup = false; // recover doppelganger from jump impact
    let playerhitwall = false; // play sound for player hitting a wall only once
    let playerwins = 0; // increment if player wins the race against his doppelganger
    let doppeldissolved = false; // the ego has transcended its alter ego
    let endofgame = false;

    function update() {
        // collision
        game.physics.arcade.collide(player, layer);
        game.physics.arcade.collide(doppel, layer);

        // doppelganger action stack
        if (doppelstart) {
            // stack
            if (actioncounter < doppelrun.length) {
                // trigger
                if (doppel.x >= doppelrun[actioncounter].x) {
                    if (doppelrun[actioncounter].action === "jump") {
                        doppeljump = true;
                    }
                    if (doppelrun[actioncounter].action === "faststart" &&
                        !doppelfast) {
                        doppelfast = true;
                    } else if (doppelrun[actioncounter].action === "faststop" &&
                        doppelfast) {
                        doppelfast = false;
                    } else if (doppelrun[actioncounter].action === "slowstart" &&
                        !doppelslow) {
                        doppelslow = true;
                    } else if (doppelrun[actioncounter].action === "slowstop" &&
                        doppelslow) {
                        doppelslow = false;
                    }
                    actioncounter++;
                }
            }

            // doppelganger movement
            if (doppelfast) {
                doppel.body.velocity.x = 250; // run fast
                doppel.animations._anims["run"].delay = 50;
            } else if (doppelslow) {
                doppel.body.velocity.x = 100; // run slow
                doppel.animations._anims["run"].delay = 150;
            } else {
                doppel.body.velocity.x = 200; // run normal
                doppel.animations._anims["run"].delay = 100;
            }

            // animation
            if (doppel.body.onFloor()) {
                if (doppelishighup) {
                    doppel.play("land");
                    game.time.events.add(Phaser.Timer.SECOND * 0.12,
                        function() {
                            doppelishighup = false;
                        }, this);
                } else {
                    if (doppel.body.velocity.x === 0) {
                        doppel.play("hit");
                    } else {
                        doppel.play("run");
                    }
                }
            } else {
                doppel.animations.stop();
                if (doppel.y < gameheight - doppel.body.height * 3) {
                    doppelishighup = true;
                }
            }
            if (doppeljump && doppel.body.onFloor()) {
                doppel.body.velocity.y = -550; // jump
                doppel.play("jump");
                doppeljump = false;
            }

            // doppelganger first through level
            if (doppel.x > tilemapwidthinpixel) {
                resetgame("doppel");
            }
            // falling into ditch
            if (doppel.y > gameheight - doppel.body.height + tilesize) {
                fallsound.play("", 0, 1, false, false);
                doppel.play("fall");
                resetgame("doppel"); // reset with old run
            }
        }

        // player movement
        if (player.body.onFloor()) {
            if (playerisjumping) {
                landsound1.play("", 0, 1, false, false);
                playerisjumping = false;
            }
            if (playerishighup) {
                player.play("land");
                landsound2.play("", 0, 1, false, false);
                game.time.events.add(Phaser.Timer.SECOND * 0.12,
                    function() {
                        playerishighup = false;
                    }, this);
            } else {
                if (player.body.velocity.x === 0) {
                    player.play("hit");
                    if (!playerhitwall) {
                        hitsound.play("", 0, 1, false, false);
                        playerhitwall = true;
                    }
                } else {
                    player.play("run");
                    if (player.animations.frame === 0) {
                        stepsound1.play("", 0, 1, false, false);
                    } else if (player.animations.frame === 3) {
                        stepsound2.play("", 0, 1, false, false);
                    }
                    playerhitwall = false;
                }
            }
        } else {
            player.animations.stop();
            playerisjumping = true;
            if (player.y < gameheight - player.body.height * 3) {
                playerishighup = true;
            }
        }

        // player input
        if (cursorkeys.up.isDown || mobilejumpstarted) {  // jump
            if (player.body.onFloor()) {
                if (!jumprecorded) {
                    player.body.velocity.y = -550;
                    player.play("jump");
                    playerisjumping = true;
                    const playerstamp = {
                        x: player.x,
                        action: "jump"
                    };
                    newdoppelrun.push(playerstamp);
                    jumprecorded = true;
                }
            }
        } else if (cursorkeys.up.isUp || mobilejumpended) {
            jumprecorded = false;
        }
        if (cursorkeys.right.isDown || mobilefaststarted) {  // run fast
            player.body.velocity.x = 250;
            player.animations._anims["run"].delay = 50;
            if (!fastrecorded) {
                const playerstamp = {
                    x: player.x,
                    action: "faststart"
                };
                newdoppelrun.push(playerstamp);
                fastrecorded = true;
            }
        }
        if ((cursorkeys.right.isUp || mobilefastended) && !endofgame) {  // run normal
            player.body.velocity.x = 200;
            player.animations._anims["run"].delay = 100;
            if (fastrecorded) {
                const playerstamp = {
                    x: player.x,
                    action: "faststop"
                };
                newdoppelrun.push(playerstamp);
                fastrecorded = false;
            }
        }
        if (cursorkeys.left.isDown || mobileslowstarted) {  // run slow
            player.body.velocity.x = 100;
            player.animations._anims["run"].delay = 150;
            if (!slowrecorded) {
                const playerstamp = {
                    x: player.x,
                    action: "slowstart"
                };
                newdoppelrun.push(playerstamp);
                slowrecorded = true;
            }
        }
        if ((cursorkeys.left.isUp && !cursorkeys.right.isDown ||
            mobileslowended && !mobilefaststarted) && !endofgame) {  // run normal
            player.body.velocity.x = 200;
            player.animations._anims["run"].delay = 100;
            if (slowrecorded) {
                const playerstamp = {
                    x: player.x,
                    action: "slowstop"
                };
                newdoppelrun.push(playerstamp);
                slowrecorded = false;
            }
        }

        // player first through level
        if (player.x > tilemapwidthinpixel) {
            resetgame("player");
        }
        // falling into ditch
        if (player.y > gameheight - player.body.height + tilesize) {
            fallsound.play("", 0, 1, false, false);
            player.play("fall");
        }
        // restart game
        if (player.y > gameheight) {
            resetgame("noone");
        }
        // end of game
        if (doppeldissolved) {
            player.body.velocity.x = 100;
            player.animations._anims["run"].delay = 150;
            if (player.alpha > 0) {
                player.alpha -= 0.005; // fade player's existence
            }
            if (player.alpha <= 0 && endofgame) {
                player.alpha = 0;
                game.camera.fade("#000000", 3000);
                music.fadeOut(3000);
                game.camera.onFadeComplete.add(function() {
                    game.paused = true;
                }, this);
                endofgame = false;
            }
        }
    }

    // reset game
    function resetgame(winner) {
        if (winner === "player") {
            doppelrun = Array.from([]);
            doppelrun = Array.from(newdoppelrun);
            olddoppelrun = Array.from(newdoppelrun);
            newdoppelrun = Array.from([]);
            actioncounter = 0;
            // doppelganger's first appearance
            if (playerwins === 0) {
                doppel.alpha = 0.5;
            } else if (playerwins > 0) {
                doppel.alpha -= 0.1; // fade doppelganger's existence
                if (doppel.alpha <= 0.1) {
                    doppel.body.velocity.x = 0;
                    doppelstart = false;
                    doppeldissolved = true;
                    game.input.keyboard.enabled = false;
                    document.getElementById("mobilecontrols")
                        .style.display = "none";
                    endofgame = true;
                }
            }
            playerwins++;
            doppeljump = false;
            doppelfast = false;
            doppelslow = false;
            doppelstart = true;
        } else if (winner === "doppel") {
            doppelrun = Array.from([]);
            doppelrun = Array.from(olddoppelrun);
            newdoppelrun = Array.from([]);
            actioncounter = 0;
            doppeljump = false;
            doppelfast = false;
            doppelslow = false;
            doppelstart = true;
        } else if (winner === "noone") {
            playerwins = 0;
            olddoppelrun = Array.from([]);
            newdoppelrun = Array.from([]);
            doppelrun = Array.from([]);
            actioncounter = 0;
            doppeljump = false;
            doppelfast = false;
            doppelslow = false;
            doppelstart = false;
            doppel.alpha = 0;
            doppel.body.velocity.x = 0;
            doppel.animations.stop();
        }

        // reset camera and player and doppelganger
        game.camera.x = 0;
        player.x = 0;
        player.y = gameheight / 2;
        doppel.x = 0;
        doppel.y = gameheight / 2;
        jumprecorded = false;
        fastrecorded = false;
        slowrecorded = false;
        player.play("run");
        doppel.play("run");
    }

    // mobile controls
    function mobilejumpstart(event) {
        event.preventDefault();
        mobilejumpstarted = true;
        mobilejumpended = false;
    }
    function mobilejumpend(event) {
        event.preventDefault();
        mobilejumpstarted = false;
        mobilejumpended = true;
    }
    function mobilefaststart(event) {
        event.preventDefault();
        mobilefaststarted = true;
        mobilefastended = false;
    }
    function mobilefastend(event) {
        event.preventDefault();
        mobilefaststarted = false;
        mobilefastended = true;
    }
    function mobileslowstart(event) {
        event.preventDefault();
        mobileslowstarted = true;
        mobileslowended = false;
    }
    function mobileslowend(event) {
        event.preventDefault();
        mobileslowstarted = false;
        mobileslowended = true;
    }
}