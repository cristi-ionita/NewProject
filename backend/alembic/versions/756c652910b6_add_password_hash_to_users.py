from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.security import hash_password


# revision identifiers, used by Alembic.
revision: str = "756c652910b6"
down_revision: Union[str, Sequence[str], None] = "175d87519af1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(length=255), nullable=True),
    )

    connection = op.get_bind()
    default_password_hash = hash_password("123456")

    connection.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = :password_hash
            WHERE password_hash IS NULL
            """
        ),
        {"password_hash": default_password_hash},
    )

    op.alter_column("users", "password_hash", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_hash")