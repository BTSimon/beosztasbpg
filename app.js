const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose'); // 1

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true
}));

mongoose.connect('mongodb+srv://sbarthatoth:<Asabasa1>@cluster0.ci07ant.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = mongoose.model('User', {
    username: String,
    password: String,
    isAdmin: Boolean,
    status: {
        type: String,
        default: 'pending'
    }
});
const Shift = mongoose.model('Shift', {
    user: String,
    day: String,
    position1: {
        type: Boolean,
        default: false
    },
    position2: {
        type: Boolean,
        default: false
    },
    confirmed: {
        type: Boolean,
        default: false
    }
});

const ShiftRequest = mongoose.model('ShiftRequest', {
    user: String,
    day: String,
    position1: {
        type: Boolean,
        default: false
    },
    position2: {
        type: Boolean,
        default: false
    },
    confirmed: {
        type: Boolean,
        default: false
    },
    finalposition: String
});


const requireLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin-login');
    }
};

app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const appliedUsers = await ShiftRequest.distinct('user');

        const allShifts = await Shift.find();

        res.send(`
        <h1>Admin Felület</h1>
        <h2>Shifts:</h2>
        <ul>
          ${appliedUsers.map(user => `
            <li>${user} - 
              <a href="/admin/confirm-shifts/${encodeURIComponent(user)}">Beosztáskérelem Elutasítása</a>
            </li>
          `).join('')}
        </ul>
  
        <h2>Beosztási nap hozzáadása:</h2>
        <form action="/admin/add-shift" method="post">
          <label for="shiftDay">Nap:</label>
          <input type="text" id="shiftDay" name="shiftDay" required>
          <br>
          <button type="submit">Hozzáadás</button>
        </form>
        
        <h2>Beosztási nap eltávolítása:</h2>
        <form action="/admin/remove-shift" method="post">
          <label for="removeShiftDay">Válaszd ki az eltávolítandó napot:</label>
          <select id="removeShiftDay" name="removeShiftDay">
            ${allShifts.map(shift => `<option value="${shift.day}">${shift.day}</option>`).join('')}
          </select>
          <br>
          <button type="submit">Eltávolítás</button>
        </form>

        <h2>Pozícíó hozzárendelése:</h2>

        <form action="/admin/assign-positions">
            <button type="submit">Hozzárendelés</button>
        </form>

        <h2>Pozícíók alaphelyzetbe állítása:</h2>
        <form action="/admin/clear-assign-positions">
            <button type="submit">Pozícíók alaphelyzetbe állítása</button>
        </form>
        
        <br>
        <a href="/admin/pending-registrations">Regisztráció Kérelmek</a>
        <br>
        <a href="/logout">Kijelentkezés</a>
      `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/assign-positions', requireAdmin, async (req, res) => { // 7

    try {
        const appliedUsers = await ShiftRequest.distinct('day');
        const allShifts = await Shift.find();
        res.send(`<form action="/admin/get-day" method="get">
        <label for="getday">Válassza ki a napot, amelyikhez pozícíókat szeretne hozzárendelni:</label>
        <select id="getday" name="getday">
          ${allShifts.map(shift => `<option value="${shift.day}">${shift.day}</option>`).join('')}
        </select>
        <br>
        <button type="submit">Megerősítés</button>
      </form>`)
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/get-day', requireAdmin, async (req, res) => { // 7
    var selectedDay = req.query.getday
    try {
        const appliedUsers = await ShiftRequest.find({
            day: selectedDay
        })
        const allShifts = await Shift.find();
        res.send(`<form action="/admin/assign-position" method="get">
            <label for="getuser">Válassza ki a felhasználót:</label>
            <select id="getuser" name="getuser">
            ${appliedUsers.map(ShiftRequest => `<option value="${ShiftRequest.user}">${ShiftRequest.user}</option>`).join('')}
            </select>
            <br>
            
            <button type="submit">Felhasználó kiválasztása</button>
            </form>`)
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/assign-position', requireAdmin, async (req, res) => { // 7

    try {
        var user1 = req.query.getuser;
        console.log('User in assign-position route:', user1);
        const appliedUsers = await ShiftRequest.find();
        const allShifts = await Shift.find();
        res.send(`<form action="/admin/assign-position-validate" method="post"">
            <input type="hidden" name="user" value="${encodeURIComponent(user1)}">
            <label for="assignShiftPosition">Pozícíó kiválasztása ${user1} részére:</label>
            <select id="assignShiftPosition" name="assignShiftPosition">
            <option value="vetítő">Vetítő<option>
            <option value="visualos">Visualos<option>
            </select>
            <br>
            <button type="submit">Hozzárendel</button>
            </form>`)

    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/assign-position-validate', requireAdmin, async (req, res) => { // 7
    var assignShiftPos = req.body.assignShiftPosition;
    var receivedUser = req.body.user;
    console.log(receivedUser)
    try {
        const appliedUser = await ShiftRequest.findOne({
            user: receivedUser
        });

        console.log(appliedUser)

        if (!appliedUser) {
            res.status(404).send('User not found');
            return;
        }

        const updateObject = {};
        if (assignShiftPos === "vetítő") {
            updateObject.$set = {
                position1: true
            };
        } else if (assignShiftPos === "visualos") {
            updateObject.$set = {
                position2: true
            };
        }

        // Apply the update using $set
        await ShiftRequest.updateOne({
            user: receivedUser
        }, updateObject);

        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }

});

app.get('/admin/clear-assign-positions', requireAdmin, async (req, res) => { // 7
    try {
        const appliedUsers = await ShiftRequest.distinct('day');
        const allShifts = await Shift.find();
        res.send(`<form action="/admin/clear-assign-position-variables" method="post">
        <label for="getday">Válassza ki a napot</label>
        <select id="getday" name="getday">
          ${allShifts.map(shift => `<option value="${shift.day}">${shift.day}</option>`).join('')}
        </select>
        <br>
        <button type="submit">Pozícíók alaphelyzetbe állítása</button>
      </form>`)
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/clear-assign-position-variables', requireAdmin, async (req, res) => { // 7
    var dayToBeCleared = req.body.getday;
    try {
        allThing = await ShiftRequest.find({
            day: dayToBeCleared
        })
        for (i = 0; i < allThing.length; i++) {
            fixThing = allThing[i];
            fixThing.position1 = false;
            fixThing.position2 = false;
            await fixThing.save();
        }
        res.redirect("/admin")
    } catch {
        res.status(500).send('Internal Server Error');
    }
});


app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', async (req, res) => {
    const {
        username,
        password
    } = req.body;

    try {
        const usernameTaken = await User.exists({
            username
        });

        if (usernameTaken) {
            res.send('Error: This username is already taken. Please choose another username.');
        } else {
            await User.create({
                username,
                password,
                isAdmin: false,
                status: 'pending'
            });

            res.send(`Sikeres regisztráció. Várjon az Admin megerősítésére.
            <br>
            <form action="/login" method="get"><button type="submit">Vissza a bejentkezéshez</button></form>`);

        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/updatePosition', requireLogin, async (req, res) => {
    const allShiftRequest = await ShiftRequest.find()
    for (i = 0; i < allShiftRequest.length; i++) {
        if (allShiftRequest[i].confirmed === true) {
            allShiftRequest[i].finalposition = "A beosztásod erre a napra el lett utasítva"
        } else if (allShiftRequest[i].position1 === false && allShiftRequest[i].position2 === false) {
            allShiftRequest[i].finalposition = "A beosztás még nem készült el"
        } else if (allShiftRequest[i].position1 === true && allShiftRequest[i].position2 === true) {
            allShiftRequest[i].finalposition = "Vetítő és Visualos"
        } else if (allShiftRequest[i].position1 === true) {
            allShiftRequest[i].finalposition = "Vetítő"
        } else if (allShiftRequest[i].position2 === true) {
            allShiftRequest[i].finalposition = "Visualos"
        }

        await allShiftRequest[i].save();
    }


    const userAppliedShifts = await ShiftRequest.find({
        user: req.session.user
    });
    res.send(`<h2>A te beosztásod:</h2>
    <ul>
      ${userAppliedShifts.map(shift => {
        const appliedShift = userAppliedShifts.find(appliedShift => appliedShift.day === shift.day);
        return `
          <li>${shift.day} - 
            ${appliedShift ? `Position: ${appliedShift.finalposition}` : 'No position applied'}
          </li>
          
        `;
        }).join('')}
        </ul>
        <form action="/" method="get"><button type="submit">Vissza a menübe</button></form>`);

});
app.get('/', requireLogin, async (req, res) => {
    try {
        const shifts = await Shift.find();

        const userAppliedShifts = await ShiftRequest.find({
            user: req.session.user
        });

        res.send(`
        <h1>Üdv, ${req.session.user}!</h1>
        <h2>Elérhető napok:</h2>
        <ul>
          ${shifts.map(shift => `
            <li>${shift.day} - 
              ${userAppliedShifts.some(appliedShift => appliedShift.day === shift.day) ? 'Jelentkeztél' : `<a href="/apply/${shift.day}">Jelentkezés</a>`}
            </li>
          `).join('')}
        </ul>
        <h2>Beosztásod:</h2>
        <form action="/updatePosition" method="post"><button type="submit">Beosztásod</Button></form>
        <form action="/logout" method="get"><button type="submit">Kijelentkezés</button></form>
      `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

app.post('/login', async (req, res) => {
    const {
        username,
        password
    } = req.body;

    try {
        const user = await User.findOne({
            username,
            password,
            status: 'approved'
        });

        if (user) {
            req.session.user = username;
            res.redirect('/');
        } else {
            const user2 = await User.findOne({
                username,
                password,
                status: 'rejected'
            });
            if (user2) {
                res.send(`A regisztrációt az Admin elutasította
                <br>
                <form action="/login" method="get"><button type="submit">Vissza a bejelentkezéshez</button></form>`)
            } else {
                const user3 = await User.findOne({
                    username,
                    password,
                    status: 'pending'
                });
                if (user3) {
                    res.send(`Az Admin hamarosan megerősítí a regisztrációt, kérem várjon.
                    <br>
                    <form action="/login" method="get"><button type="submit">Vissza a bejelentkezéshez</button></form>`)
                } else {
                    res.send(`A felhasználó: ${username} nem található, vagy a kód rossz
                    <br>
                    <form action="/login" method="get"><button type="submit">Vissza a bejelentkezéshez</button></form>
                    <br>
                    <br>
                    <form action="/admin-login" method="get"><button type="submit">Admin vagy?</button></form>`)
                }
            }
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/apply/:day', requireLogin, async (req, res) => {
    const {
        day
    } = req.params;

    try {
        const existingShift = await Shift.findOne({
            user: req.session.user,
            day
        });

        if (existingShift) {
            console.log('Shift already applied:', existingShift);
            res.send('Error: You have already applied for this day.');
        } else {
            console.log('Creating new shift...');
            const newShiftRequest = new ShiftRequest({
                user: req.session.user,
                day,
                confirmed: false,
            });

            await newShiftRequest.save();
            console.log('Shift created:', newShiftRequest);
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/confirm-shifts/:user/:day', requireAdmin, async (req, res) => {
    const {
        user,
        day
    } = req.params;

    try {
        const shiftToConfirm = await ShiftRequest.findOne({
            user,
            day,
            confirmed: false
        });

        if (shiftToConfirm === null) {
            console.log('Shift already confirmed or not applied:', shiftToConfirm);
            res.send(`Error: ${user}'s shift on ${confirmedDay} has not been applied or is already confirmed.         
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            console.log('Shift to confirm:', shiftToConfirm);

            shiftToConfirm.confirmed = true;
            await shiftToConfirm.save();

            console.log('Shift confirmed:', shiftToConfirm);

            res.redirect(`/admin/confirm-shifts/${encodeURIComponent(user)}`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/add-shift', requireAdmin, async (req, res) => {
    const {
        shiftDay
    } = req.body;

    try {
        // Check if the day is already taken
        const dayTaken = await Shift.exists({
            day: shiftDay
        });

        if (dayTaken) {
            res.send(`Error: This day is already taken. Please choose another day.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            // Save the new shift to the database
            await Shift.create({
                day: shiftDay
            });
            res.redirect('/admin');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/remove-shift', requireAdmin, async (req, res) => {
    const {
        removeShiftDay
    } = req.body;

    try {
        // Check if the day is already taken
        const dayExists = await Shift.exists({
            day: removeShiftDay
        });
        if (!dayExists) {
            res.send(`Error: This day does not exist.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            // Remove the shift from the database
            await Shift.deleteOne({
                day: removeShiftDay
            });
        }
        var whileDone = false;
        while (whileDone == false) {
            const dayRequestExists = await ShiftRequest.exists({
                day: removeShiftDay
            });
            if (dayRequestExists) {
                await ShiftRequest.deleteOne({
                    day: removeShiftDay
                });
            } else {
                whileDone = true;
            }
        }

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
    const dayRequestExists = await ShiftRequest.exists({
        day: removeShiftDay
    });
    res.redirect("/admin");
});

app.get('/admin/assign-shifts', requireAdmin, async (req, res) => {
    try {
        // Retrieve all users who applied for shifts
        const appliedUsers = await ShiftRequest.distinct('user');

        res.send(`
        <h1>Assign Shifts</h1>
        <ul>
          ${appliedUsers.map(user => `
            <li>${user} - <a href="/admin/assign-shifts/${encodeURIComponent(user)}/${encodeURIComponent(req.session.day)}">Confirm</a></li>
          `).join('')}
        </ul>
        <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>
      `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/login');
        }
    });
});

app.get('/select-day', requireLogin, (req, res) => {
    res.sendFile(__dirname + '/public/select-day.html');
});

app.post('/select-day', requireLogin, async (req, res) => {
    const selectedDay = req.body.day;

    try {
        // Check if the day is already taken
        const dayTaken = await Shift.exists({
            day: selectedDay
        });

        if (dayTaken) {
            res.send(`Error: This day is already taken. Please choose another day.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            req.session.day = selectedDay;

            // Save the shift to the database
            await Shift.create({
                user: req.session.user,
                day: selectedDay
            });

            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin-login', (req, res) => {
    res.sendFile(__dirname + '/public/admin-login.html');
});

app.post('/admin-login', async (req, res) => {
    const {
        username,
        password
    } = req.body;

    try {
        // Check if the user is an admin
        const adminUser = await User.findOne({
            username,
            password,
            isAdmin: true
        });

        console.log(adminUser);

        if (adminUser) {
            req.session.user = username;
            req.session.isAdmin = true;
            res.redirect('/admin');
        } else {
            console.log('Admin login failed.');
            res.redirect('/admin-login');
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/confirm-shifts/:user', requireAdmin, async (req, res) => {
    const {
        user
    } = req.params;

    try {
        const userShifts = await ShiftRequest.find({
            user
        });

        res.send(`
        <h1>Confirm Shifts for ${user}</h1>
        <<form action="/admin/confirm-shifts/${encodeURIComponent(user)}" method="post">
        <label for="confirmedDay">Select Shift to Confirm:</label>
        <select id="confirmedDay" name="confirmedDay">
            ${userShifts.map(shift => `<option value="${shift.day}">${shift.day}</option>`).join('')}
        </select>
        <br>
        <button type="submit">Confirm Shift</button>
        </form>
        <br>
        <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>
      `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/confirm-shifts/:user', requireAdmin, async (req, res) => {
    const {
        user
    } = req.params;
    const {
        confirmedDay
    } = req.body;

    try {
        const shiftToConfirm = await ShiftRequest.findOne({
            user,
            day: confirmedDay,
            confirmed: false
        });

        if (!shiftToConfirm) {
            console.log('Shift already confirmed or not applied:', shiftToConfirm);
            res.send(`Error: ${user}'s shift on ${confirmedDay} has not been applied or is already confirmed.`);
        } else {
            console.log('Shift to confirm:', shiftToConfirm);

            shiftToConfirm.confirmed = true;
            await shiftToConfirm.save();

            console.log('Shift confirmed:', shiftToConfirm);

            res.redirect(`/admin/confirm-shifts/${encodeURIComponent(user)}`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/approve-users', requireAdmin, async (req, res) => {
    try {
        const pendingUsers = await User.find({
            status: 'pending'
        });

        res.send(`
            <h1>Approve Users</h1>
            <ul>
                ${pendingUsers.map(user => `
                    <li>${user.username} - 
                        <a href="/admin/approve-user/${encodeURIComponent(user.username)}">Approve</a>
                    </li>
                `).join('')}
            </ul>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/approve-user/:username', requireAdmin, async (req, res) => {
    const {
        username
    } = req.params;

    try {
        const userToApprove = await User.findOne({
            username,
            status: 'pending'
        });

        if (!userToApprove) {
            res.send(`Error: User ${username} is not pending approval.`);
        } else {
            // Update the user's status to 'approved'
            userToApprove.status = 'approved';
            await userToApprove.save();

            res.send(`User ${username} has been approved.`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/pending-registrations', requireAdmin, async (req, res) => {
    try {
        const pendingUsers = await User.find({
            status: 'pending'
        });

        res.send(`
            <h1>Pending Registrations</h1>
            <ul>
                ${pendingUsers.map(user => `
                    <li>${user.username} - 
                        <a href="/admin/approve-user/${encodeURIComponent(user.username)}">Approve</a>
                        <a href="/admin/reject-user/${encodeURIComponent(user.username)}">Reject</a>
                    </li>
                `).join('')}
            </ul>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/approve-user/:username', requireAdmin, async (req, res) => {
    const {
        username
    } = req.params;

    try {
        const userToApprove = await User.findOne({
            username,
            status: 'pending'
        });

        if (!userToApprove) {
            res.send(`Error: User ${username} is not pending approval.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            userToApprove.status = 'approved';
            await userToApprove.save();

            res.send(`User ${username} has been approved.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>
            `);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/reject-user/:username', requireAdmin, async (req, res) => {
    const {
        username
    } = req.params;

    try {
        const userToReject = await User.findOne({
            username,
            status: 'pending'
        });

        if (!userToReject) {
            res.send(`Error: User ${username} is not pending approval.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        } else {
            // Update the user's status to 'rejected'
            userToReject.status = 'rejected';
            await userToReject.save();

            res.send(`User ${username} has been rejected.
            <br>
            <form action="/admin" method="get"><button type="submit">Back To Admin Dashboard</button></form>`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});